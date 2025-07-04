import { type NextRequest, NextResponse } from "next/server"

interface Transaction {
  invoiceNo: string
  items: Array<{ id: string; name: string; date?: string }>
  date?: string | null
}

interface DailyPattern {
  date: string
  frequentItemsets: Array<{
    items: Array<{ id: string; name: string }>
    support: number
  }>
  associationRules: Array<{
    antecedent: Array<{ id: string; name: string }>
    consequent: Array<{ id: string; name: string }>
    support: number
    confidence: number
    lift: number
  }>
  transactionCount: number
}

// Helper function to parse date
function parseDate(dateStr: string): Date | null {
  try {
    // Try multiple date formats
    const formats = [
      // ISO format: YYYY-MM-DD
      /^\d{4}-\d{2}-\d{2}$/,
      // DD/MM/YYYY
      /^\d{2}\/\d{2}\/\d{4}$/,
      // MM/DD/YYYY
      /^\d{2}\/\d{2}\/\d{4}$/,
      // DD-MM-YYYY
      /^\d{2}-\d{2}-\d{4}$/,
    ]

    let date: Date | null = null

    if (formats[0].test(dateStr)) {
      // ISO format
      date = new Date(dateStr)
    } else if (formats[1].test(dateStr) || formats[3].test(dateStr)) {
      // DD/MM/YYYY or DD-MM-YYYY
      const separator = dateStr.includes('/') ? '/' : '-'
      const [day, month, year] = dateStr.split(separator)
      date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
    } else if (formats[2].test(dateStr)) {
      // MM/DD/YYYY
      const [month, day, year] = dateStr.split('/')
      date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
    } else {
      // Try to parse as is
      date = new Date(dateStr)
    }

    return isNaN(date.getTime()) ? null : date
  } catch {
    return null
  }
}

// Helper function to format date as YYYY-MM-DD
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

// Simple Eclat implementation for daily patterns
function runDailyEclat(
  transactions: Transaction[],
  allProducts: string[],
  minSupport: number,
  transactionCount: number
): Array<{ items: string[]; support: number }> {
  const frequentItemsets: Array<{ items: string[]; support: number }> = []
  
  // Generate 1-itemsets
  const itemCounts: Record<string, number> = {}
  transactions.forEach(transaction => {
    const uniqueItems = new Set(transaction.items.map(item => item.id))
    uniqueItems.forEach(item => {
      itemCounts[item] = (itemCounts[item] || 0) + 1
    })
  })

  // Filter frequent 1-itemsets
  const frequent1Itemsets: string[] = []
  Object.entries(itemCounts).forEach(([item, count]) => {
    const support = count / transactionCount
    if (support >= minSupport) {
      frequent1Itemsets.push(item)
      frequentItemsets.push({ items: [item], support })
    }
  })

  // Generate 2-itemsets and higher
  let currentItemsets = frequent1Itemsets.map(item => [item])
  let k = 2

  while (currentItemsets.length > 0 && k <= 3) { // Limit to 3-itemsets for performance
    const candidateItemsets: string[][] = []
    
    // Generate candidates
    for (let i = 0; i < currentItemsets.length; i++) {
      for (let j = i + 1; j < currentItemsets.length; j++) {
        const itemset1 = currentItemsets[i]
        const itemset2 = currentItemsets[j]
        
        // Check if they can be joined (differ by one item)
        const combined = [...new Set([...itemset1, ...itemset2])].sort()
        if (combined.length === k) {
          candidateItemsets.push(combined)
        }
      }
    }

    // Remove duplicates
    const uniqueCandidates = candidateItemsets.filter((candidate, index, self) => 
      index === self.findIndex(c => JSON.stringify(c) === JSON.stringify(candidate))
    )

    // Count support for candidates
    const nextItemsets: string[][] = []
    uniqueCandidates.forEach(candidate => {
      let count = 0
      transactions.forEach(transaction => {
        const transactionItems = new Set(transaction.items.map(item => item.id))
        if (candidate.every(item => transactionItems.has(item))) {
          count++
        }
      })
      
      const support = count / transactionCount
      if (support >= minSupport) {
        nextItemsets.push(candidate)
        frequentItemsets.push({ items: candidate, support })
      }
    })

    currentItemsets = nextItemsets
    k++
  }

  return frequentItemsets
}

// Generate association rules from frequent itemsets
function generateDailyRules(
  frequentItemsets: Array<{ items: string[]; support: number }>,
  transactionCount: number,
  minConfidence: number,
  productMap: Record<string, string>
): Array<{
  antecedent: Array<{ id: string; name: string }>
  consequent: Array<{ id: string; name: string }>
  support: number
  confidence: number
  lift: number
}> {
  const rules: Array<{
    antecedent: Array<{ id: string; name: string }>
    consequent: Array<{ id: string; name: string }>
    support: number
    confidence: number
    lift: number
  }> = []

  // Generate rules from itemsets with 2 or more items
  frequentItemsets
    .filter(itemset => itemset.items.length >= 2)
    .forEach(itemset => {
      const items = itemset.items
      
      // Generate all possible antecedent-consequent combinations
      for (let i = 1; i < Math.pow(2, items.length) - 1; i++) {
        const antecedent: string[] = []
        const consequent: string[] = []
        
        for (let j = 0; j < items.length; j++) {
          if (i & (1 << j)) {
            antecedent.push(items[j])
          } else {
            consequent.push(items[j])
          }
        }
        
        if (antecedent.length > 0 && consequent.length > 0) {
          // Find support of antecedent
          const antecedentItemset = frequentItemsets.find(fi => 
            fi.items.length === antecedent.length &&
            antecedent.every(item => fi.items.includes(item))
          )
          
          if (antecedentItemset) {
            const confidence = itemset.support / antecedentItemset.support
            
            if (confidence >= minConfidence) {
              // Calculate lift
              const consequentItemset = frequentItemsets.find(fi =>
                fi.items.length === consequent.length &&
                consequent.every(item => fi.items.includes(item))
              )
              
              const lift = consequentItemset ? confidence / consequentItemset.support : confidence
              
              rules.push({
                antecedent: antecedent.map(id => ({ id, name: productMap[id] || id })),
                consequent: consequent.map(id => ({ id, name: productMap[id] || id })),
                support: itemset.support,
                confidence,
                lift
              })
            }
          }
        }
      }
    })

  return rules.sort((a, b) => b.lift - a.lift)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      transactions,
      productMap,
      targetDate,
      algorithm = "eclat",
      minSupport = 0.01,
      minConfidence = 0.2,
    } = body

    if (!transactions || !productMap || !targetDate) {
      return NextResponse.json({ success: false, error: "Missing required data" }, { status: 400 })
    }

    // Parse target date
    const targetDateObj = parseDate(targetDate)
    if (!targetDateObj) {
      return NextResponse.json({ success: false, error: "Invalid target date format" }, { status: 400 })
    }

    // Calculate previous date
    const previousDate = new Date(targetDateObj)
    previousDate.setDate(previousDate.getDate() - 1)
    const previousDateStr = formatDate(previousDate)

    // Filter transactions for the previous date
    const previousDayTransactions = transactions.filter((transaction: Transaction) => {
      if (!transaction.date) return false
      const transactionDate = parseDate(transaction.date)
      if (!transactionDate) return false
      return formatDate(transactionDate) === previousDateStr
    })

    if (previousDayTransactions.length === 0) {
      return NextResponse.json({
        success: false,
        error: `No transactions found for previous date: ${previousDateStr}`,
      }, { status: 400 })
    }

    console.log(`Analyzing daily patterns for ${previousDateStr} (${previousDayTransactions.length} transactions)`)

    // Get all unique product IDs from previous day
    const allProducts = [...new Set(
      previousDayTransactions.flatMap((t: Transaction) => t.items.map(item => item.id))
    )] as string[]

    // Run algorithm on previous day's data
    const frequentItemsets = runDailyEclat(
      previousDayTransactions,
      allProducts,
      minSupport,
      previousDayTransactions.length
    )

    if (frequentItemsets.length === 0) {
      return NextResponse.json({
        success: false,
        message: `No frequent itemsets found for ${previousDateStr}. Try lowering the minimum support.`,
      })
    }

    // Generate association rules
    const rules = generateDailyRules(
      frequentItemsets,
      previousDayTransactions.length,
      minConfidence,
      productMap
    )

    // Format results
    const formattedItemsets = frequentItemsets.map(itemset => ({
      items: itemset.items.map(itemId => ({
        id: itemId,
        name: productMap[itemId] || itemId,
      })),
      support: itemset.support,
    }))

    const dailyPattern: DailyPattern = {
      date: previousDateStr,
      frequentItemsets: formattedItemsets,
      associationRules: rules,
      transactionCount: previousDayTransactions.length,
    }

    return NextResponse.json({
      success: true,
      pattern: dailyPattern,
      targetDate: formatDate(targetDateObj),
      previousDate: previousDateStr,
      algorithm,
      parameters: {
        minSupport,
        minConfidence,
      },
    })

  } catch (error) {
    console.error("Error in daily patterns analysis:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred" },
      { status: 500 }
    )
  }
}
