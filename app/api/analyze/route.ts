import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      transactions,
      productMap,
      algorithm = "eclat",
      minSupport = 0.01,
      minConfidence = 0.2,
      compareAlgorithms = false,
    } = body

    if (!transactions || !productMap) {
      return NextResponse.json({ success: false, error: "Missing required data" }, { status: 400 })
    }

    console.log(`Running algorithm: ${algorithm} with minSupport: ${minSupport} and minConfidence: ${minConfidence}`)

    // Get all unique product IDs
    const allProducts = Object.keys(productMap)
    const transactionCount = transactions.length

    // Initialize process logs
    const processLogs = {
      eclat: [],
      fpgrowth: [],
    }

    // Run selected algorithm(s)
    let frequentItemsets = []
    let comparisonData = null

    // If compareAlgorithms is true, run both algorithms
    if (compareAlgorithms) {
      // Run Eclat
      console.log("Running Eclat algorithm...")
      const eclatStartTime = performance.now()
      const eclatItemsets = runEclat(transactions, allProducts, minSupport, transactionCount, processLogs.eclat)
      const eclatEndTime = performance.now()
      const eclatTime = eclatEndTime - eclatStartTime

      // Run FP-Growth
      console.log("Running FP-Growth algorithm...")
      const fpStartTime = performance.now()
      const fpItemsets = runFPGrowth(transactions, allProducts, minSupport, transactionCount, processLogs.fpgrowth)
      const fpEndTime = performance.now()
      const fpTime = fpEndTime - fpStartTime

      // Use the selected algorithm's results as the main result
      frequentItemsets = algorithm.toLowerCase() === "eclat" ? eclatItemsets : fpItemsets

      // Prepare comparison data
      comparisonData = {
        eclat: {
          itemsetCount: eclatItemsets.length,
          executionTime: eclatTime,
          itemsetsBySize: countItemsetsBySize(eclatItemsets),
        },
        fpgrowth: {
          itemsetCount: fpItemsets.length,
          executionTime: fpTime,
          itemsetsBySize: countItemsetsBySize(fpItemsets),
        },
      }
    } else {
      // Run only the selected algorithm
      if (algorithm.toLowerCase() === "eclat") {
        console.log("Running Eclat algorithm...")
        frequentItemsets = runEclat(transactions, allProducts, minSupport, transactionCount, processLogs.eclat)
      } else {
        console.log("Running FP-Growth algorithm...")
        frequentItemsets = runFPGrowth(transactions, allProducts, minSupport, transactionCount, processLogs.fpgrowth)
      }
    }

    // Check if any frequent itemsets were found
    if (frequentItemsets.length === 0) {
      return NextResponse.json({
        success: false,
        message: "No frequent itemsets found with the current parameters. Try lowering the minimum support.",
      })
    }

    // Generate association rules
    const rules = generateRules(frequentItemsets, transactionCount, minConfidence, processLogs[algorithm.toLowerCase()])

    // Format results
    const formattedItemsets = frequentItemsets.map((itemset) => ({
      items: itemset.items.map((itemId) => ({
        id: itemId,
        name: productMap[itemId] || itemId,
      })),
      support: itemset.support,
    }))

    const formattedRules = rules.map((rule) => ({
      antecedent: rule.antecedent.map((itemId) => ({
        id: itemId,
        name: productMap[itemId] || itemId,
      })),
      consequent: rule.consequent.map((itemId) => ({
        id: itemId,
        name: productMap[itemId] || itemId,
      })),
      support: rule.support,
      confidence: rule.confidence,
      lift: rule.lift,
    }))

    // Prepare algorithm parameters for response
    const algorithmParams = {
      algorithm,
      minSupport,
      minConfidence,
      transactionCount,
      productCount: Object.keys(productMap).length,
    }

    return NextResponse.json({
      success: true,
      frequent_itemsets: formattedItemsets,
      association_rules: formattedRules,
      algorithm_params: algorithmParams,
      process_logs: processLogs,
      comparison_data: comparisonData,
    })
  } catch (error) {
    console.error("Error in analyze handler:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred" },
      { status: 500 },
    )
  }
}

// Helper function to count itemsets by size
function countItemsetsBySize(itemsets) {
  const counts = {}
  itemsets.forEach((itemset) => {
    const size = itemset.items.length
    counts[size] = (counts[size] || 0) + 1
  })
  return counts
}

// Eclat algorithm implementation - using vertical database approach
function runEclat(transactions, allProducts, minSupport, transactionCount, processLog) {
  const minSupportCount = Math.ceil(minSupport * transactionCount)

  processLog.push(
    `Starting Eclat algorithm with minimum support count: ${minSupportCount} (${(minSupport * 100).toFixed(2)}%)`,
  )
  processLog.push(`Total transactions: ${transactionCount}, Total unique products: ${allProducts.length}`)

  // Step 1: Create vertical database (tid-lists)
  const verticalDB = {}
  allProducts.forEach((product) => {
    verticalDB[product] = new Set()
  })

  // Populate vertical database
  transactions.forEach((transaction, tid) => {
    const items = transaction.items.map((item) => item.id)
    items.forEach((item) => {
      if (verticalDB[item]) {
        verticalDB[item].add(tid)
      }
    })
  })

  processLog.push(`Created vertical database with ${Object.keys(verticalDB).length} items`)

  // Step 2: Filter items that don't meet minimum support
  const frequentItems = {}
  Object.entries(verticalDB).forEach(([item, tidSet]) => {
    if (tidSet.size >= minSupportCount) {
      frequentItems[item] = tidSet
    }
  })

  processLog.push(`Found ${Object.keys(frequentItems).length} frequent 1-itemsets`)

  // Step 3: Generate frequent itemsets
  const result = []
  // Use a Set to track unique itemsets and prevent duplicates
  const uniqueItemsetKeys = new Set()

  // Add 1-itemsets to result
  Object.entries(frequentItems).forEach(([item, tidSet]) => {
    const itemsetKey = [item].sort().join(",")
    if (!uniqueItemsetKeys.has(itemsetKey)) {
      uniqueItemsetKeys.add(itemsetKey)
      result.push({
        items: [item],
        support: tidSet.size / transactionCount,
      })
    }
  })

  // Generate 2-itemsets and 3-itemsets using the vertical database approach
  const items = Object.keys(frequentItems)

  processLog.push(`Generating 2-itemsets from ${items.length} frequent items`)
  let twoItemsetCount = 0

  // Generate 2-itemsets
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const item1 = items[i]
      const item2 = items[j]

      // Compute intersection of tid-lists (key feature of Eclat)
      const intersection = new Set()
      frequentItems[item1].forEach((tid) => {
        if (frequentItems[item2].has(tid)) {
          intersection.add(tid)
        }
      })

      if (intersection.size >= minSupportCount) {
        const itemsetKey = [item1, item2].sort().join(",")
        if (!uniqueItemsetKeys.has(itemsetKey)) {
          uniqueItemsetKeys.add(itemsetKey)
          result.push({
            items: [item1, item2],
            support: intersection.size / transactionCount,
          })
          twoItemsetCount++

          // Store the intersection for generating 3-itemsets
          frequentItems[`${item1},${item2}`] = intersection
        }
      }
    }
  }

  processLog.push(`Found ${twoItemsetCount} frequent 2-itemsets`)
  processLog.push(`Generating 3-itemsets`)
  let threeItemsetCount = 0

  // Generate 3-itemsets (limited to avoid stack overflow)
  const pairs = Object.keys(frequentItems).filter((key) => key.includes(","))

  for (let i = 0; i < pairs.length; i++) {
    const pair = pairs[i].split(",")
    if (pair.length !== 2) continue

    for (let j = 0; j < items.length; j++) {
      const item = items[j]
      // Skip if item is already in the pair
      if (pair.includes(item)) continue

      // Compute intersection
      const intersection = new Set()
      frequentItems[pairs[i]].forEach((tid) => {
        if (frequentItems[item].has(tid)) {
          intersection.add(tid)
        }
      })

      if (intersection.size >= minSupportCount) {
        const itemsetKey = [...pair, item].sort().join(",")
        if (!uniqueItemsetKeys.has(itemsetKey)) {
          uniqueItemsetKeys.add(itemsetKey)
          result.push({
            items: [...pair, item],
            support: intersection.size / transactionCount,
          })
          threeItemsetCount++
        }
      }
    }
  }

  processLog.push(`Found ${threeItemsetCount} frequent 3-itemsets`)
  processLog.push(`Eclat algorithm completed. Total frequent itemsets found: ${result.length}`)

  return result
}

// FP-Growth algorithm implementation - using horizontal database and pattern growth
function runFPGrowth(transactions, allProducts, minSupport, transactionCount, processLog) {
  const minSupportCount = Math.ceil(minSupport * transactionCount)

  processLog.push(
    `Starting FP-Growth algorithm with minimum support count: ${minSupportCount} (${(minSupport * 100).toFixed(2)}%)`,
  )
  processLog.push(`Total transactions: ${transactionCount}, Total unique products: ${allProducts.length}`)

  // Step 1: Count item frequencies
  const itemCounts = {}
  transactions.forEach((transaction) => {
    const items = transaction.items.map((item) => item.id)
    // Count each unique item once per transaction
    const uniqueItems = [...new Set(items)]
    uniqueItems.forEach((item) => {
      itemCounts[item] = (itemCounts[item] || 0) + 1
    })
  })

  processLog.push(`Counted frequencies for ${Object.keys(itemCounts).length} items`)

  // Step 2: Filter infrequent items
  const frequentItems = Object.entries(itemCounts)
    .filter(([_, count]) => count >= minSupportCount)
    .sort(([_, countA], [__, countB]) => countB - countA) // Sort by frequency descending
    .map(([item]) => item)

  processLog.push(`Found ${frequentItems.length} frequent items after filtering`)

  // Create a mapping of items to their position in the frequency-ordered list
  const itemOrder = {}
  frequentItems.forEach((item, index) => {
    itemOrder[item] = index
  })

  // Step 3: Transform transactions to only include frequent items, sorted by frequency
  const transformedTransactions = transactions
    .map((transaction) => {
      return transaction.items
        .map((item) => item.id)
        .filter((item) => frequentItems.includes(item))
        .sort((a, b) => itemOrder[a] - itemOrder[b])
    })
    .filter((items) => items.length > 0)

  processLog.push(`Transformed ${transformedTransactions.length} transactions for FP-Tree construction`)

  // Count patterns in the transformed transactions
  const patterns = {}

  // Count 1-itemsets
  frequentItems.forEach((item) => {
    patterns[item] = itemCounts[item]
  })

  processLog.push(`Added ${frequentItems.length} frequent 1-itemsets`)
  processLog.push(`Generating 2-itemsets`)
  let twoItemsetCount = 0

  // Count 2-itemsets using the transformed transactions
  for (let i = 0; i < frequentItems.length; i++) {
    for (let j = i + 1; j < frequentItems.length; j++) {
      const item1 = frequentItems[i]
      const item2 = frequentItems[j]

      let pairCount = 0
      transformedTransactions.forEach((transaction) => {
        if (transaction.includes(item1) && transaction.includes(item2)) {
          pairCount++
        }
      })

      if (pairCount >= minSupportCount) {
        patterns[`${item1},${item2}`] = pairCount
        twoItemsetCount++
      }
    }
  }

  processLog.push(`Found ${twoItemsetCount} frequent 2-itemsets`)
  processLog.push(`Generating 3-itemsets`)
  let threeItemsetCount = 0

  // Count 3-itemsets (limited to avoid stack overflow)
  for (let i = 0; i < frequentItems.length; i++) {
    for (let j = i + 1; j < frequentItems.length; j++) {
      for (let k = j + 1; k < frequentItems.length; k++) {
        const item1 = frequentItems[i]
        const item2 = frequentItems[j]
        const item3 = frequentItems[k]

        let tripletCount = 0
        transformedTransactions.forEach((transaction) => {
          if (transaction.includes(item1) && transaction.includes(item2) && transaction.includes(item3)) {
            tripletCount++
          }
        })

        if (tripletCount >= minSupportCount) {
          patterns[`${item1},${item2},${item3}`] = tripletCount
          threeItemsetCount++
        }
      }
    }
  }

  processLog.push(`Found ${threeItemsetCount} frequent 3-itemsets`)

  // Convert patterns to the result format
  const result = []
  const uniqueItemsetKeys = new Set()

  Object.entries(patterns).forEach(([itemsStr, count]) => {
    const items = itemsStr.includes(",") ? itemsStr.split(",") : [itemsStr]
    const itemsetKey = [...items].sort().join(",")
    if (!uniqueItemsetKeys.has(itemsetKey)) {
      uniqueItemsetKeys.add(itemsetKey)
      result.push({
        items: items,
        support: count / transactionCount,
      })
    }
  })

  processLog.push(`FP-Growth algorithm completed. Total frequent itemsets found: ${result.length}`)

  return result
}

// Generate association rules
function generateRules(frequentItemsets, transactionCount, minConfidence, processLog) {
  processLog.push(`Generating association rules with minimum confidence: ${(minConfidence * 100).toFixed(2)}%`)

  const rules = []

  // Create a map for quick lookup of itemsets
  const itemsetMap = new Map()
  frequentItemsets.forEach((itemset) => {
    const key = itemset.items.sort().join(",")
    itemsetMap.set(key, itemset)
  })

  // Process itemsets with 2 or more items
  const multiItemsets = frequentItemsets.filter((itemset) => itemset.items.length >= 2)
  processLog.push(`Found ${multiItemsets.length} itemsets with 2 or more items for rule generation`)

  for (const itemset of multiItemsets) {
    // Generate all possible non-empty proper subsets as antecedents
    const subsets = generateAllSubsets(itemset.items)

    for (const subset of subsets) {
      // Skip empty subset and the full set
      if (subset.length === 0 || subset.length === itemset.items.length) continue

      const antecedent = subset
      const consequent = itemset.items.filter((item) => !antecedent.includes(item))

      // Skip if consequent is empty
      if (consequent.length === 0) continue

      // Find support of antecedent
      const antecedentKey = [...antecedent].sort().join(",")
      const antecedentItemset = itemsetMap.get(antecedentKey)

      if (antecedentItemset) {
        const confidence = itemset.support / antecedentItemset.support

        if (confidence >= minConfidence) {
          // Find support of consequent
          const consequentKey = [...consequent].sort().join(",")
          const consequentItemset = itemsetMap.get(consequentKey)

          if (consequentItemset) {
            const lift = confidence / consequentItemset.support

            rules.push({
              antecedent,
              consequent,
              support: itemset.support,
              confidence,
              lift,
            })
          }
        }
      }
    }
  }

  processLog.push(`Generated ${rules.length} association rules`)

  // Sort rules by lift in descending order
  rules.sort((a, b) => b.lift - a.lift)

  processLog.push(`Top rule has lift: ${rules.length > 0 ? rules[0].lift.toFixed(2) : "N/A"}`)

  return rules
}

// Generate all possible subsets of an array - iterative approach to avoid stack overflow
function generateAllSubsets(array) {
  const result = []
  const n = array.length

  // Generate 2^n possible subsets using bit manipulation
  const totalSubsets = 1 << n

  for (let i = 1; i < totalSubsets; i++) {
    const subset = []
    for (let j = 0; j < n; j++) {
      // Check if jth bit is set in i
      if (i & (1 << j)) {
        subset.push(array[j])
      }
    }
    result.push(subset)
  }

  return result
}
