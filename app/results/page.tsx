"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, FileDown, Home, BarChartIcon, PieChartIcon, GitCompare } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"

interface ItemWithName {
  id: string
  name: string
}

interface FrequentItemset {
  items: ItemWithName[]
  support: number
}

interface AssociationRule {
  antecedent: ItemWithName[]
  consequent: ItemWithName[]
  support: number
  confidence: number
  lift: number
}

interface AlgorithmParams {
  algorithm: string
  minSupport: number
  minConfidence: number
  transactionCount: number
  productCount: number
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

export default function ResultsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [frequentItemsets, setFrequentItemsets] = useState<FrequentItemset[]>([])
  const [associationRules, setAssociationRules] = useState<AssociationRule[]>([])
  const [params, setParams] = useState<AlgorithmParams | null>(null)
  const [exportFormat, setExportFormat] = useState<string>("csv")
  const [visualizationType, setVisualizationType] = useState<string>("bar")
  const [topBundlingOptions, setTopBundlingOptions] = useState<any[]>([])
  const [scatterData, setScatterData] = useState<any[]>([])
  const [processLogs, setProcessLogs] = useState<Record<string, string[]>>({})
  const [dailyPattern, setDailyPattern] = useState<DailyPattern | null>(null)
  const [dailyPatternLoading, setDailyPatternLoading] = useState(false)
  const [dailyPatternError, setDailyPatternError] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>("")
  const [dailyBundlingOptions, setDailyBundlingOptions] = useState<any[]>([])
  const [hasDateColumn, setHasDateColumn] = useState(false)
  const [availableDates, setAvailableDates] = useState<string[]>([])

  const COLORS = [
    "#0088FE",
    "#00C49F",
    "#FFBB28",
    "#FF8042",
    "#8884D8",
    "#82CA9D",
    "#FFC658",
    "#8DD1E1",
    "#A4DE6C",
    "#D0ED57",
  ]

  useEffect(() => {
    try {
      // Load algorithm parameters
      const storedParams = localStorage.getItem("algorithmParams")
      if (!storedParams) {
        setError("Parameter algoritma tidak ditemukan")
        setLoading(false)
        return
      }

      const parsedParams = JSON.parse(storedParams) as AlgorithmParams
      setParams(parsedParams)

      // Check if data has date column
      const storedTransactions = localStorage.getItem("transactions")
      if (storedTransactions) {
        const transactions = JSON.parse(storedTransactions)
        const hasDate = transactions.some((t: any) => t.date)
        setHasDateColumn(hasDate)
        
        if (hasDate) {
          // Extract unique dates from transactions with transaction counts
          const dateStats = new Map<string, number>()
          transactions.forEach((transaction: any) => {
            if (transaction.date) {
              try {
                // Parse date and format consistently
                let formattedDate: string
                if (transaction.date.includes('/')) {
                  // Handle DD/MM/YYYY format
                  const [day, month, year] = transaction.date.split('/')
                  const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
                  formattedDate = dateObj.toISOString().split('T')[0]
                } else {
                  // Handle other formats
                  const dateObj = new Date(transaction.date)
                  formattedDate = dateObj.toISOString().split('T')[0]
                }
                dateStats.set(formattedDate, (dateStats.get(formattedDate) || 0) + 1)
              } catch (error) {
                console.warn('Failed to parse date:', transaction.date)
              }
            }
          })
          
          // Sort dates in descending order (newest first)
          const sortedDates = Array.from(dateStats.keys()).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
          setAvailableDates(sortedDates)
          
          // Set default date to the latest available date
          if (sortedDates.length > 0) {
            setSelectedDate(sortedDates[0])
          }
        }
      }

      console.log(`Displaying results for algorithm: ${parsedParams.algorithm}`)

      // Load frequent itemsets
      const storedItemsets = localStorage.getItem("frequentItemsets")
      if (!storedItemsets) {
        setError("Hasil analisis tidak ditemukan")
        setLoading(false)
        return
      }

      const parsedItemsets = JSON.parse(storedItemsets) as FrequentItemset[]
      // Sort by support in descending order
      const sortedItemsets = [...parsedItemsets].sort((a, b) => b.support - a.support)
      setFrequentItemsets(sortedItemsets)

      console.log(`Loaded ${sortedItemsets.length} frequent itemsets from ${parsedParams.algorithm} algorithm`)

      // Load association rules
      const storedRules = localStorage.getItem("associationRules")
      if (!storedRules) {
        setError("Hasil analisis tidak ditemukan")
        setLoading(false)
        return
      }

      const parsedRules = JSON.parse(storedRules) as AssociationRule[]
      // Sort by lift in descending order
      const sortedRules = [...parsedRules].sort((a, b) => b.lift - a.lift)
      setAssociationRules(sortedRules)

      console.log(`Loaded ${sortedRules.length} association rules from ${parsedParams.algorithm} algorithm`)

      // Prepare top bundling options (rules with highest lift and multiple items)
      prepareTopBundlingOptions(sortedRules, parsedParams.transactionCount)

      // Prepare scatter data for visualization
      prepareScatterData(sortedRules)

      // Load process logs if available
      const storedLogs = localStorage.getItem("processLogs")
      if (storedLogs) {
        setProcessLogs(JSON.parse(storedLogs))
      }

      setLoading(false)
    } catch (err) {
      console.error("Error loading results:", err)
      setError("Terjadi kesalahan saat memuat hasil analisis")
      setLoading(false)
    }
  }, [])

  const prepareTopBundlingOptions = (rules: AssociationRule[], transactionCount: number) => {
    // Filter rules with multiple items in antecedent or consequent
    const bundlingRules = rules.filter((rule) => rule.antecedent.length + rule.consequent.length >= 2)

    // Sort by lift (best indicator for bundling)
    const sortedByLift = [...bundlingRules].sort((a, b) => b.lift - a.lift)

    // Take top 10
    const top10 = sortedByLift.slice(0, 10)

    // Format for display
    const formattedOptions = top10.map((rule) => {
      const allItems = [...rule.antecedent, ...rule.consequent]
      return {
        items: allItems.map((item) => item.name).join(" + "),
        support: rule.support,
        confidence: rule.confidence,
        lift: rule.lift,
        count: Math.round(rule.support * transactionCount),
        itemCount: allItems.length,
      }
    })

    setTopBundlingOptions(formattedOptions)
  }

  const prepareScatterData = (rules: AssociationRule[]) => {
    // Create data for scatter plot (support vs confidence with lift as size)
    const data = rules.map((rule) => {
      return {
        name: [...rule.antecedent, ...rule.consequent].map((item) => item.name).join(" + "),
        support: Number.parseFloat((rule.support * 100).toFixed(2)),
        confidence: Number.parseFloat((rule.confidence * 100).toFixed(2)),
        lift: Number.parseFloat(rule.lift.toFixed(2)),
        // Size proportional to lift for visualization
        z: Math.min(rule.lift * 10, 50), // Cap size for very high lift values
      }
    })

    setScatterData(data)
  }

  // Function to get transaction count for a specific date
  const getTransactionCountForDate = (date: string): number => {
    const storedTransactions = localStorage.getItem("transactions")
    if (!storedTransactions) return 0

    const transactions = JSON.parse(storedTransactions)
    let count = 0
    
    transactions.forEach((transaction: any) => {
      if (transaction.date) {
        try {
          let transactionDate: string
          if (transaction.date.includes('/')) {
            const [day, month, year] = transaction.date.split('/')
            const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
            transactionDate = dateObj.toISOString().split('T')[0]
          } else {
            const dateObj = new Date(transaction.date)
            transactionDate = dateObj.toISOString().split('T')[0]
          }
          if (transactionDate === date) {
            count++
          }
        } catch {
          // Ignore invalid dates
        }
      }
    })
    
    return count
  }

  // Function to analyze daily bundling pattern based on previous day
  const analyzeDailyBundlingPattern = async (targetDate: string) => {
    if (!params || !hasDateColumn || !targetDate) return

    // Check if target date is in available dates
    if (!availableDates.includes(targetDate)) {
      setDailyPatternError("Tanggal yang dipilih tidak tersedia dalam dataset")
      return
    }

    setDailyPatternLoading(true)
    setDailyPatternError(null)

    try {
      // Calculate previous day
      const target = new Date(targetDate)
      const previousDay = new Date(target)
      previousDay.setDate(target.getDate() - 1)
      const previousDateStr = previousDay.toISOString().split('T')[0]

      // Check if previous day data exists in available dates
      if (!availableDates.includes(previousDateStr)) {
        // Find the closest previous date that exists in the dataset
        const targetTime = previousDay.getTime()
        const closestPreviousDate = availableDates
          .filter(date => new Date(date).getTime() < targetTime)
          .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]
        
        if (!closestPreviousDate) {
          throw new Error(`Tidak ada data transaksi sebelum tanggal ${targetDate}`)
        }
        
        // Use the closest previous date
        const actualPreviousDate = closestPreviousDate
        
        // Get transactions from localStorage
        const storedTransactions = localStorage.getItem("transactions")
        if (!storedTransactions) {
          throw new Error("Data transaksi tidak ditemukan")
        }

        const allTransactions = JSON.parse(storedTransactions)
        
        // Filter transactions for the actual previous day
        const previousDayTransactions = allTransactions.filter((transaction: any) => {
          if (!transaction.date) return false
          
          try {
            let transactionDate: string
            if (transaction.date.includes('/')) {
              // Handle DD/MM/YYYY format
              const [day, month, year] = transaction.date.split('/')
              const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
              transactionDate = dateObj.toISOString().split('T')[0]
            } else {
              const dateObj = new Date(transaction.date)
              transactionDate = dateObj.toISOString().split('T')[0]
            }
            return transactionDate === actualPreviousDate
          } catch {
            return false
          }
        })

        if (previousDayTransactions.length === 0) {
          throw new Error(`Tidak ada data transaksi untuk tanggal ${actualPreviousDate}`)
        }

        // Continue with analysis using actualPreviousDate
        return await performAnalysis(previousDayTransactions, actualPreviousDate, targetDate)
      } else {
        // Use the calculated previous day
        return await performAnalysis(null, previousDateStr, targetDate)
      }
    } catch (error) {
      console.error("Error analyzing daily pattern:", error)
      setDailyPatternError(error instanceof Error ? error.message : "Terjadi kesalahan saat menganalisis pola harian")
    } finally {
      setDailyPatternLoading(false)
    }
  }

  // Helper function to perform the actual analysis
  const performAnalysis = async (preFilteredTransactions: any[] | null, analysisDate: string, targetDate: string) => {
    try {
      let previousDayTransactions: any[]
      
      if (preFilteredTransactions) {
        previousDayTransactions = preFilteredTransactions
      } else {
        // Get transactions from localStorage
        const storedTransactions = localStorage.getItem("transactions")
        if (!storedTransactions) {
          throw new Error("Data transaksi tidak ditemukan")
        }

        const allTransactions = JSON.parse(storedTransactions)
        
        // Filter transactions for the analysis date
        previousDayTransactions = allTransactions.filter((transaction: any) => {
          if (!transaction.date) return false
          
          try {
            let transactionDate: string
            if (transaction.date.includes('/')) {
              // Handle DD/MM/YYYY format
              const [day, month, year] = transaction.date.split('/')
              const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
              transactionDate = dateObj.toISOString().split('T')[0]
            } else {
              const dateObj = new Date(transaction.date)
              transactionDate = dateObj.toISOString().split('T')[0]
            }
            return transactionDate === analysisDate
          } catch {
            return false
          }
        })
      }

      if (previousDayTransactions.length === 0) {
        throw new Error(`Tidak ada data transaksi untuk tanggal ${analysisDate}`)
      }

      // Get productMap from localStorage
      const storedProductMap = localStorage.getItem("productMap")
      if (!storedProductMap) {
        throw new Error("Product map tidak ditemukan")
      }
      const productMap = JSON.parse(storedProductMap)

      // Prepare data for analysis with the same algorithm and parameters
      const analysisData = {
        transactions: previousDayTransactions,
        productMap: productMap,
        algorithm: params!.algorithm,
        minSupport: params!.minSupport,
        minConfidence: params!.minConfidence,
      }

      // Call analyze API for previous day data
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(analysisData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Gagal menganalisis pola harian")
      }

      const result = await response.json()

      // Process the results for daily pattern
      const dailyResult: DailyPattern = {
        date: analysisDate,
        frequentItemsets: result.frequent_itemsets || [],
        associationRules: result.association_rules || [],
        transactionCount: previousDayTransactions.length,
      }

      setDailyPattern(dailyResult)

      // Prepare daily bundling options similar to main bundling options
      if (result.association_rules && result.association_rules.length > 0) {
        const dailyOptions = result.association_rules
          .sort((a: any, b: any) => b.lift - a.lift)
          .slice(0, 10)
          .map((rule: any, index: number) => {
            const allItems = [...rule.antecedent, ...rule.consequent]
            return {
              rank: index + 1,
              items: allItems.map((item: any) => item.name).join(" + "),
              support: rule.support,
              confidence: rule.confidence,
              lift: rule.lift,
              count: Math.round(rule.support * previousDayTransactions.length),
              itemCount: allItems.length,
              analysisDate: analysisDate,
              targetDate: targetDate,
            }
          })

        setDailyBundlingOptions(dailyOptions)
      }

    } catch (error) {
      throw error // Re-throw to be caught by parent function
    }
  }

  const handleExport = () => {
    try {
      if (exportFormat === "csv") {
        // Export as CSV
        let csvContent = "data:text/csv;charset=utf-8,"

        // Export top bundling options
        csvContent += "TOP 10 BUNDLING RECOMMENDATIONS\n"
        csvContent += "No,Items,Support,Confidence,Lift,Count\n"

        topBundlingOptions.forEach((bundle, index) => {
          csvContent += `${index + 1},"${bundle.items}",${(bundle.support * 100).toFixed(2)}%,${(bundle.confidence * 100).toFixed(2)}%,${bundle.lift.toFixed(2)},${bundle.count}\n`
        })

        csvContent += "\nFREQUENT ITEMSETS\n"
        csvContent += "No,Itemset,Support,Count\n"

        frequentItemsets.forEach((itemset, index) => {
          const itemNames = itemset.items.map((item) => item.name).join(", ")
          const count = Math.round(itemset.support * (params?.transactionCount || 0))
          csvContent += `${index + 1},"${itemNames}",${(itemset.support * 100).toFixed(2)}%,${count}\n`
        })

        csvContent += "\nASSOCIATION RULES\n"
        csvContent += "No,Rule,Support,Confidence,Lift\n"

        associationRules.forEach((rule, index) => {
          const antecedent = rule.antecedent.map((item) => item.name).join(", ")
          const consequent = rule.consequent.map((item) => item.name).join(", ")
          csvContent += `${index + 1},"${antecedent} -> ${consequent}",${(rule.support * 100).toFixed(2)}%,${(rule.confidence * 100).toFixed(2)}%,${rule.lift.toFixed(2)}\n`
        })

        const encodedUri = encodeURI(csvContent)
        const link = document.createElement("a")
        link.setAttribute("href", encodedUri)
        link.setAttribute(
          "download",
          `analisis_penjualan_${params?.algorithm || "algorithm"}_${new Date().toISOString().split("T")[0]}.csv`,
        )
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      } else {
        // For PDF, we'll just show an alert since we can't generate PDFs in the browser without libraries
        alert("Ekspor PDF memerlukan library tambahan. Silakan gunakan opsi CSV.")
      }
    } catch (err) {
      console.error("Error exporting data:", err)
      alert("Terjadi kesalahan saat mengekspor data")
    }
  }

  const handleFinish = () => {
    // Bersihkan localStorage dan kembali ke halaman utama
    localStorage.removeItem("sessionId")
    localStorage.removeItem("csvContent")
    localStorage.removeItem("transactions")
    localStorage.removeItem("productMap")
    localStorage.removeItem("totalTransactions")
    localStorage.removeItem("totalProducts")
    localStorage.removeItem("algorithmParams")
    localStorage.removeItem("frequentItemsets")
    localStorage.removeItem("associationRules")
    localStorage.removeItem("processLogs")
    localStorage.removeItem("comparisonData")

    router.push("/")
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border rounded shadow-lg">
          <p className="font-bold">{payload[0].payload.items || payload[0].payload.name}</p>
          <p>Support: {payload[0].payload.support}%</p>
          {payload[0].payload.confidence !== undefined && <p>Confidence: {payload[0].payload.confidence}%</p>}
          {payload[0].payload.lift !== undefined && <p>Lift: {payload[0].payload.lift}</p>}
          <p>Count: {payload[0].payload.count} transactions</p>
        </div>
      )
    }
    return null
  }

  // Prepare data for algorithm visualization
  const prepareAlgorithmVisualization = () => {
    if (params?.algorithm === "eclat") {
      // Prepare Eclat TID-lists visualization
      return (
        <div className="border rounded-md p-4 bg-white">
          <h3 className="text-md font-medium mb-4">Representasi Vertikal Database (TID-lists)</h3>
          <div className="space-y-4">
            {frequentItemsets.slice(0, 5).map((itemset, index) => {
              if (itemset.items.length === 1) {
                const item = itemset.items[0]
                const supportCount = Math.round(itemset.support * (params?.transactionCount || 0))
                const tidList = Array.from({ length: supportCount }, (_, i) => i + 1)

                return (
                  <div key={index} className="space-y-1">
                    <div className="font-medium">{item.name}</div>
                    <div className="flex flex-wrap gap-1">
                      {tidList.map((tid) => (
                        <div key={tid} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-xs">
                          TID: {tid}
                        </div>
                      ))}
                      {tidList.length > 10 && (
                        <div className="bg-slate-100 text-slate-800 px-2 py-1 rounded-md text-xs">
                          +{supportCount - 10} more
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-slate-500">
                      Support: {(itemset.support * 100).toFixed(1)}% ({supportCount} transactions)
                    </div>
                  </div>
                )
              }
              return null
            })}
          </div>

          <div className="mt-6">
            <h3 className="text-md font-medium mb-4">Interseksi TID-lists untuk 2-itemsets</h3>
            <div className="space-y-4">
              {frequentItemsets
                .filter((itemset) => itemset.items.length === 2)
                .slice(0, 3)
                .map((itemset, index) => {
                  const supportCount = Math.round(itemset.support * (params?.transactionCount || 0))
                  return (
                    <div key={index} className="p-3 border rounded-md">
                      <div className="font-medium mb-2">{itemset.items.map((item) => item.name).join(" ∩ ")}</div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <div className="text-sm font-medium">{itemset.items[0].name}</div>
                          <div className="flex flex-wrap gap-1">
                            {Array.from({ length: Math.min(8, supportCount + 3) }, (_, i) => i + 1).map((tid) => (
                              <div key={tid} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-xs">
                                {tid}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-sm font-medium">{itemset.items[1].name}</div>
                          <div className="flex flex-wrap gap-1">
                            {Array.from({ length: Math.min(8, supportCount + 2) }, (_, i) => i + 2).map((tid) => (
                              <div key={tid} className="bg-green-100 text-green-800 px-2 py-1 rounded-md text-xs">
                                {tid}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-sm font-medium">Intersection</div>
                          <div className="flex flex-wrap gap-1">
                            {Array.from({ length: Math.min(5, supportCount) }, (_, i) => i + 2).map((tid) => (
                              <div key={tid} className="bg-purple-100 text-purple-800 px-2 py-1 rounded-md text-xs">
                                {tid}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-slate-500 mt-2">
                        Support: {(itemset.support * 100).toFixed(1)}% ({supportCount} transactions)
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        </div>
      )
    } else {
      // Prepare FP-Growth Tree visualization
      return (
        <div className="border rounded-md p-4 bg-white">
          <h3 className="text-md font-medium mb-4">FP-Tree Visualization</h3>
          <div className="h-[400px] overflow-auto">
            <div className="pl-4 border-l-2 border-slate-300">
              <div className="font-bold">Root</div>
              {frequentItemsets
                .filter((itemset) => itemset.items.length === 1)
                .sort((a, b) => b.support - a.support)
                .slice(0, 5)
                .map((itemset, index) => {
                  const supportCount = Math.round(itemset.support * (params?.transactionCount || 0))
                  return (
                    <div key={index} className="pl-4 mt-2 border-l-2 border-slate-300">
                      <div className="font-medium">
                        {itemset.items[0].name} ({supportCount})
                        {index < 2 && frequentItemsets.filter((i) => i.items.length === 2).length > 0 && (
                          <div className="pl-4 mt-2 border-l-2 border-slate-300">
                            {frequentItemsets
                              .filter(
                                (i) => i.items.length === 2 && i.items.some((item) => item.id === itemset.items[0].id),
                              )
                              .sort((a, b) => b.support - a.support)
                              .slice(0, 2)
                              .map((childItemset, childIndex) => {
                                const childItem = childItemset.items.find((item) => item.id !== itemset.items[0].id)
                                const childSupportCount = Math.round(
                                  childItemset.support * (params?.transactionCount || 0),
                                )
                                return (
                                  <div key={childIndex} className="font-medium">
                                    {childItem?.name} ({childSupportCount})
                                    {childIndex === 0 &&
                                      frequentItemsets.filter((i) => i.items.length === 3).length > 0 && (
                                        <div className="pl-4 mt-2 border-l-2 border-slate-300">
                                          {frequentItemsets
                                            .filter(
                                              (i) =>
                                                i.items.length === 3 &&
                                                i.items.some((item) => item.id === itemset.items[0].id) &&
                                                i.items.some((item) => item.id === childItem?.id),
                                            )
                                            .sort((a, b) => b.support - a.support)
                                            .slice(0, 1)
                                            .map((grandchildItemset, grandchildIndex) => {
                                              const grandchildItem = grandchildItemset.items.find(
                                                (item) => item.id !== itemset.items[0].id && item.id !== childItem?.id,
                                              )
                                              const grandchildSupportCount = Math.round(
                                                grandchildItemset.support * (params?.transactionCount || 0),
                                              )
                                              return (
                                                <div key={grandchildIndex}>
                                                  {grandchildItem?.name} ({grandchildSupportCount})
                                                </div>
                                              )
                                            })}
                                        </div>
                                      )}
                                  </div>
                                )
                              })}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-md font-medium mb-2">Header Table</h3>
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Support Count</TableHead>
                    <TableHead>Node-Link</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {frequentItemsets
                    .filter((itemset) => itemset.items.length === 1)
                    .sort((a, b) => b.support - a.support)
                    .slice(0, 5)
                    .map((itemset, index) => {
                      const supportCount = Math.round(itemset.support * (params?.transactionCount || 0))
                      return (
                        <TableRow key={index}>
                          <TableCell>{itemset.items[0].name}</TableCell>
                          <TableCell className="text-right">{supportCount}</TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <div className="h-2 w-2 rounded-full bg-blue-500 mr-1"></div>
                              <div className="h-[1px] w-8 bg-blue-500"></div>
                              <div className="h-2 w-2 rounded-full bg-blue-500 mx-1"></div>
                              {index < 3 && (
                                <>
                                  <div className="h-[1px] w-8 bg-blue-500"></div>
                                  <div className="h-2 w-2 rounded-full bg-blue-500 ml-1"></div>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle className="flex items-center">
            Hasil Analisis dengan{" "}
            {params?.algorithm === "eclat" ? (
              <span className="ml-2 text-blue-600 font-bold">Algoritma Eclat</span>
            ) : (
              <span className="ml-2 text-green-600 font-bold">Algoritma FP-Growth</span>
            )}
          </CardTitle>
          <CardDescription>
            {params &&
              `Menggunakan minimum support ${(params.minSupport * 100).toFixed(2)}% dan minimum confidence ${(params.minConfidence * 100).toFixed(2)}%`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center p-8 space-y-4">
              <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-emerald-500"></div>
              <p className="text-lg font-medium text-slate-700">Memproses hasil analisis...</p>
              <p className="text-sm text-slate-500">
                Mohon tunggu sebentar, kami sedang mempersiapkan hasil analisis data Anda.
              </p>
            </div>
          ) : (
            <>
              <div className="flex justify-center space-x-4 mb-4">
                <Button variant="outline" className="w-full max-w-md" onClick={() => router.push("/comparison")}>
                  <GitCompare className="mr-2 h-4 w-4" />
                  Lihat Perbandingan Algoritma
                </Button>
                <Button variant="outline" className="w-full max-w-md" onClick={() => router.push("/report")}>
                  <FileDown className="mr-2 h-4 w-4" />
                  Lihat Laporan
                </Button>
              </div>

              {/* Summary cards */}
              {params && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Transaksi</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{params.transactionCount}</div>
                      <p className="text-xs text-muted-foreground">Total transaksi yang dianalisis</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Produk</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{params.productCount}</div>
                      <p className="text-xs text-muted-foreground">Total produk unik dalam dataset</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Pola Ditemukan</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{frequentItemsets.length}</div>
                      <p className="text-xs text-muted-foreground">Frequent itemsets yang ditemukan</p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Top 10 Bundling Recommendations */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-medium">Top 10 Rekomendasi Bundling Produk</CardTitle>
                  <CardDescription>Kombinasi produk terbaik berdasarkan nilai lift</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-md overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>No</TableHead>
                          <TableHead>Produk</TableHead>
                          <TableHead className="text-right">Support</TableHead>
                          <TableHead className="text-right">Confidence</TableHead>
                          <TableHead className="text-right">Lift</TableHead>
                          <TableHead className="text-right">Jumlah Transaksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {topBundlingOptions.map((bundle, index) => (
                          <TableRow key={index}>
                            <TableCell>{index + 1}</TableCell>
                            <TableCell className="font-medium">{bundle.items}</TableCell>
                            <TableCell className="text-right">{(bundle.support * 100).toFixed(2)}%</TableCell>
                            <TableCell className="text-right">{(bundle.confidence * 100).toFixed(2)}%</TableCell>
                            <TableCell className="text-right">{bundle.lift.toFixed(2)}</TableCell>
                            <TableCell className="text-right">{bundle.count}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              <Tabs defaultValue="visualization">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="visualization">Visualisasi</TabsTrigger>
                  <TabsTrigger value="algorithm">Visualisasi Algoritma</TabsTrigger>
                  <TabsTrigger value="details">Detail Hasil</TabsTrigger>
                  {hasDateColumn && <TabsTrigger value="daily-pattern">Pola Harian</TabsTrigger>}
                </TabsList>

                <TabsContent value="visualization" className="mt-4">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-medium">Visualisasi Hasil Analisis</h3>
                      <div className="flex space-x-2">
                        <Button
                          variant={visualizationType === "bar" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setVisualizationType("bar")}
                        >
                          <BarChartIcon className="h-4 w-4 mr-1" />
                          Bar Chart
                        </Button>
                        <Button
                          variant={visualizationType === "pie" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setVisualizationType("pie")}
                        >
                          <PieChartIcon className="h-4 w-4 mr-1" />
                          Pie Chart
                        </Button>
                      </div>
                    </div>

                    <p className="text-sm text-slate-500">
                      {visualizationType === "bar"
                        ? "Top 10 rekomendasi bundling produk berdasarkan nilai lift"
                        : "Distribusi support untuk top 10 rekomendasi bundling"}
                    </p>

                    <div className="border rounded-md p-4 bg-white">
                      {visualizationType === "bar" && (
                        <div className="space-y-4">
                          <div className="h-[400px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart
                                data={topBundlingOptions.map((item, index) => ({ ...item, index: index + 1 }))}
                                margin={{ top: 20, right: 30, left: 40, bottom: 20 }}
                              >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="index" />
                                <YAxis domain={[0, "dataMax"]} />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend />
                                {topBundlingOptions.map((_, index) => (
                                  <Bar
                                    key={index}
                                    dataKey="lift"
                                    name={`Produk ${index + 1}`}
                                    fill={COLORS[index % COLORS.length]}
                                    stackId="stack"
                                    hide={index !== 0}
                                  />
                                ))}
                                <Bar dataKey="lift" name="Lift" fill={COLORS[0]} hide />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="border rounded-md p-4 bg-slate-50 max-h-60 overflow-auto">
                            <h4 className="font-medium mb-2">Keterangan Produk:</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {topBundlingOptions.map((bundle, index) => (
                                <div key={index} className="flex items-center">
                                  <div
                                    className="w-4 h-4 mr-2"
                                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                  ></div>
                                  <span className="text-sm">
                                    <span className="font-medium">Produk {index + 1}:</span> {bundle.items}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {visualizationType === "pie" && (
                        <div className="h-[500px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={topBundlingOptions}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                outerRadius={180}
                                fill="#8884d8"
                                dataKey="support"
                                nameKey="items"
                              >
                                {topBundlingOptions.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip content={<CustomTooltip />} />
                              <Legend />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="algorithm" className="mt-4">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">
                      Visualisasi Algoritma {params?.algorithm === "eclat" ? "Eclat" : "FP-Growth"}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {params?.algorithm === "eclat"
                        ? "Representasi vertikal database dan proses interseksi TID-lists dalam algoritma Eclat"
                        : "Struktur FP-Tree dan header table yang digunakan dalam algoritma FP-Growth"}
                    </p>

                    {prepareAlgorithmVisualization()}
                  </div>
                </TabsContent>

                <TabsContent value="details" className="mt-4">
                  <Tabs defaultValue="itemsets">
                    <TabsList>
                      <TabsTrigger value="itemsets">Frequent Itemsets</TabsTrigger>
                      <TabsTrigger value="rules">Association Rules</TabsTrigger>
                      <TabsTrigger value="process">Proses Algoritma</TabsTrigger>
                    </TabsList>

                    <TabsContent value="itemsets" className="mt-4">
                      <div className="border rounded-md overflow-auto max-h-96">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>No</TableHead>
                              <TableHead>Itemset</TableHead>
                              <TableHead className="text-right">Support</TableHead>
                              <TableHead className="text-right">Count</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {frequentItemsets.map((itemset, index) => (
                              <TableRow key={index}>
                                <TableCell>{index + 1}</TableCell>
                                <TableCell>{itemset.items.map((item) => item.name).join(", ")}</TableCell>
                                <TableCell className="text-right">{(itemset.support * 100).toFixed(2)}%</TableCell>
                                <TableCell className="text-right">
                                  {Math.round(itemset.support * (params?.transactionCount || 0))}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </TabsContent>

                    <TabsContent value="rules" className="mt-4">
                      <div className="border rounded-md overflow-auto max-h-96">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>No</TableHead>
                              <TableHead>Rule</TableHead>
                              <TableHead className="text-right">Support</TableHead>
                              <TableHead className="text-right">Confidence</TableHead>
                              <TableHead className="text-right">Lift</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {associationRules.map((rule, index) => (
                              <TableRow key={index}>
                                <TableCell>{index + 1}</TableCell>
                                <TableCell>
                                  {rule.antecedent.map((item) => item.name).join(", ")} {"->"}{" "}
                                  {rule.consequent.map((item) => item.name).join(", ")}
                                </TableCell>
                                <TableCell className="text-right">{(rule.support * 100).toFixed(2)}%</TableCell>
                                <TableCell className="text-right">{(rule.confidence * 100).toFixed(2)}%</TableCell>
                                <TableCell className="text-right">{rule.lift.toFixed(2)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </TabsContent>

                    <TabsContent value="process" className="mt-4">
                      <ScrollArea className="h-[400px] w-full rounded-md border p-4">
                        {processLogs[params?.algorithm || "eclat"] &&
                        processLogs[params?.algorithm || "eclat"].length > 0 ? (
                          <div className="space-y-2">
                            {processLogs[params?.algorithm || "eclat"].map((log, index) => (
                              <div key={index} className="text-sm">
                                <span className="text-slate-500">[{index + 1}]</span> {log}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-slate-500">
                            Tidak ada log proses yang tersedia untuk algoritma{" "}
                            {params?.algorithm === "eclat" ? "Eclat" : "FP-Growth"}.
                          </p>
                        )}
                      </ScrollArea>
                    </TabsContent>
                  </Tabs>
                </TabsContent>

                {hasDateColumn && (
                  <TabsContent value="daily-pattern" className="mt-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Analisis Pola Bundling Harian</CardTitle>
                        <CardDescription>
                          Analisis pola bundling berdasarkan data hari sebelumnya
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="bg-blue-50 p-4 rounded-lg border">
                          <h4 className="font-medium text-blue-800 mb-2">Informasi Dataset</h4>
                          <p className="text-sm text-blue-700">
                            Dataset memiliki {availableDates.length} hari dengan data transaksi.
                            Tanggal tersedia: {availableDates.length > 0 && (() => {
                              const firstDate = new Date(availableDates[availableDates.length - 1])
                              const lastDate = new Date(availableDates[0])
                              const firstDisplay = `${firstDate.getDate().toString().padStart(2, '0')}/${(firstDate.getMonth() + 1).toString().padStart(2, '0')}/${firstDate.getFullYear()}`
                              const lastDisplay = `${lastDate.getDate().toString().padStart(2, '0')}/${(lastDate.getMonth() + 1).toString().padStart(2, '0')}/${lastDate.getFullYear()}`
                              return `${firstDisplay} s/d ${lastDisplay}`
                            })()}
                          </p>
                        </div>

                        <div className="flex items-center space-x-4">
                          <label htmlFor="target-date" className="text-sm font-medium">
                            Pilih Tanggal Target:
                          </label>
                          <Select value={selectedDate} onValueChange={setSelectedDate}>
                            <SelectTrigger className="w-48">
                              <SelectValue placeholder="Pilih tanggal..." />
                            </SelectTrigger>
                            <SelectContent>
                              {availableDates.map((date) => {
                                // Format date for display (DD/MM/YYYY)
                                const dateObj = new Date(date)
                                const displayDate = `${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getFullYear()}`
                                const dayName = dateObj.toLocaleDateString('id-ID', { weekday: 'long' })
                                const transactionCount = getTransactionCountForDate(date)
                                
                                return (
                                  <SelectItem key={date} value={date}>
                                    {displayDate} ({dayName}) - {transactionCount} transaksi
                                  </SelectItem>
                                )
                              })}
                            </SelectContent>
                          </Select>
                          <Button
                            onClick={() => analyzeDailyBundlingPattern(selectedDate)}
                            disabled={!selectedDate || dailyPatternLoading || availableDates.length === 0}
                          >
                            {dailyPatternLoading ? "Menganalisis..." : "Analisis Pola"}
                          </Button>
                        </div>

                        {availableDates.length === 0 && hasDateColumn && (
                          <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Info</AlertTitle>
                            <AlertDescription>
                              Tidak ada tanggal yang valid ditemukan dalam dataset.
                            </AlertDescription>
                          </Alert>
                        )}

                        {selectedDate && (
                          <div className="text-sm text-muted-foreground">
                            Akan menganalisis data dari: {(() => {
                              const targetDateObj = new Date(selectedDate)
                              const previousDateObj = new Date(targetDateObj)
                              previousDateObj.setDate(targetDateObj.getDate() - 1)
                              const displayDate = `${previousDateObj.getDate().toString().padStart(2, '0')}/${(previousDateObj.getMonth() + 1).toString().padStart(2, '0')}/${previousDateObj.getFullYear()}`
                              const dayName = previousDateObj.toLocaleDateString('id-ID', { weekday: 'long' })
                              return `${displayDate} (${dayName})`
                            })()}
                          </div>
                        )}

                        {dailyPatternError && (
                          <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{dailyPatternError}</AlertDescription>
                          </Alert>
                        )}

                        {dailyPattern && (
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <Card>
                                <CardHeader className="pb-2">
                                  <CardDescription>Tanggal Analisis</CardDescription>
                                  <CardTitle className="text-2xl">{dailyPattern.date}</CardTitle>
                                </CardHeader>
                              </Card>
                              <Card>
                                <CardHeader className="pb-2">
                                  <CardDescription>Total Transaksi</CardDescription>
                                  <CardTitle className="text-2xl">{dailyPattern.transactionCount}</CardTitle>
                                </CardHeader>
                              </Card>
                              <Card>
                                <CardHeader className="pb-2">
                                  <CardDescription>Frequent Itemsets</CardDescription>
                                  <CardTitle className="text-2xl">{dailyPattern.frequentItemsets.length}</CardTitle>
                                </CardHeader>
                              </Card>
                            </div>

                            {dailyBundlingOptions.length > 0 && (
                              <Card>
                                <CardHeader>
                                  <CardTitle>Top 10 Rekomendasi Bundling Harian</CardTitle>
                                  <CardDescription>
                                    Berdasarkan data transaksi tanggal {dailyPattern.date}
                                  </CardDescription>
                                </CardHeader>
                                <CardContent>
                                  <div className="border rounded-md overflow-auto max-h-96">
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead>Rank</TableHead>
                                          <TableHead>Bundle Items</TableHead>
                                          <TableHead className="text-right">Support</TableHead>
                                          <TableHead className="text-right">Confidence</TableHead>
                                          <TableHead className="text-right">Lift</TableHead>
                                          <TableHead className="text-right">Count</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {dailyBundlingOptions.map((bundle, index) => (
                                          <TableRow key={index}>
                                            <TableCell className="font-medium">{bundle.rank}</TableCell>
                                            <TableCell className="max-w-xs truncate">{bundle.items}</TableCell>
                                            <TableCell className="text-right">{(bundle.support * 100).toFixed(2)}%</TableCell>
                                            <TableCell className="text-right">{(bundle.confidence * 100).toFixed(2)}%</TableCell>
                                            <TableCell className="text-right">{bundle.lift.toFixed(2)}</TableCell>
                                            <TableCell className="text-right">{bundle.count}</TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </div>
                                </CardContent>
                              </Card>
                            )}

                            <Card>
                              <CardHeader>
                                <CardTitle>Frequent Itemsets Harian</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="border rounded-md overflow-auto max-h-96">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>No</TableHead>
                                        <TableHead>Itemset</TableHead>
                                        <TableHead className="text-right">Support</TableHead>
                                        <TableHead className="text-right">Count</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {dailyPattern.frequentItemsets.slice(0, 20).map((itemset, index) => (
                                        <TableRow key={index}>
                                          <TableCell>{index + 1}</TableCell>
                                          <TableCell>{itemset.items.map((item) => item.name).join(", ")}</TableCell>
                                          <TableCell className="text-right">{(itemset.support * 100).toFixed(2)}%</TableCell>
                                          <TableCell className="text-right">
                                            {Math.round(itemset.support * dailyPattern.transactionCount)}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                )}
              </Tabs>

              <div className="flex items-center space-x-4 pt-4">
                <div className="text-sm font-medium">Ekspor Laporan:</div>
                <Select value={exportFormat} onValueChange={setExportFormat}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">CSV</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={handleExport} disabled={loading}>
                  <FileDown className="mr-2 h-4 w-4" />
                  Ekspor
                </Button>
              </div>
            </>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => router.push("/algorithm")}>
            Kembali
          </Button>
          <Button onClick={handleFinish} disabled={loading}>
            <Home className="mr-2 h-4 w-4" />
            Selesai
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
