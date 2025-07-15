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
  const [weeklyPredictions, setWeeklyPredictions] = useState<{[key: string]: any}>({})
  const [weeklyPredictionLoading, setWeeklyPredictionLoading] = useState(false)
  const [weeklyPredictionError, setWeeklyPredictionError] = useState<string | null>(null)

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

  // Function to analyze bundling pattern based on same day of week
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
      // Parse target date to get day of week
      const targetDateObj = new Date(targetDate)
      const targetDayOfWeek = targetDateObj.getDay() // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
      
      // Get transactions from localStorage
      const storedTransactions = localStorage.getItem("transactions")
      if (!storedTransactions) {
        throw new Error("Data transaksi tidak ditemukan")
      }

      const allTransactions = JSON.parse(storedTransactions)
      
      // Filter transactions for the same day of week
      const sameDayTransactions = allTransactions.filter((transaction: any) => {
        if (!transaction.date) return false
        
        try {
          let transactionDate: Date
          if (transaction.date.includes('/')) {
            // Handle DD/MM/YYYY format
            const [day, month, year] = transaction.date.split('/')
            transactionDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
          } else {
            transactionDate = new Date(transaction.date)
          }
          
          // Check if it's the same day of week
          return transactionDate.getDay() === targetDayOfWeek
        } catch {
          return false
        }
      })

      if (sameDayTransactions.length === 0) {
        const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
        throw new Error(`Tidak ada data transaksi untuk hari ${dayNames[targetDayOfWeek]} dalam dataset`)
      }

      // Get productMap from localStorage
      const storedProductMap = localStorage.getItem("productMap")
      if (!storedProductMap) {
        throw new Error("Product map tidak ditemukan")
      }
      const productMap = JSON.parse(storedProductMap)

      // Prepare data for analysis with the same algorithm and parameters
      const analysisData = {
        transactions: sameDayTransactions,
        productMap: productMap,
        algorithm: params!.algorithm,
        minSupport: params!.minSupport,
        minConfidence: params!.minConfidence,
      }

      // Call analyze API for same day of week data
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
      const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
      const dailyResult: DailyPattern = {
        date: `${dayNames[targetDayOfWeek]} (${sameDayTransactions.length} transaksi)`,
        frequentItemsets: result.frequent_itemsets || [],
        associationRules: result.association_rules || [],
        transactionCount: sameDayTransactions.length,
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
              count: Math.round(rule.support * sameDayTransactions.length),
              itemCount: allItems.length,
              analysisDate: `${dayNames[targetDayOfWeek]}`,
              targetDate: targetDate,
            }
          })

        setDailyBundlingOptions(dailyOptions)
      }
    } catch (error) {
      console.error("Error analyzing daily pattern:", error)
      setDailyPatternError(error instanceof Error ? error.message : "Terjadi kesalahan saat menganalisis pola harian")
    } finally {
      setDailyPatternLoading(false)
    }
  }

  // Function to analyze weekly predictions from latest date
  const analyzeWeeklyPredictions = async () => {
    if (!params || !hasDateColumn || availableDates.length === 0) return

    setWeeklyPredictionLoading(true)
    setWeeklyPredictionError(null)
    
    const predictions: {[key: string]: any} = {}
    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
    
    try {
      // Get transactions from localStorage
      const storedTransactions = localStorage.getItem("transactions")
      const storedProductMap = localStorage.getItem("productMap")
      
      if (!storedTransactions || !storedProductMap) {
        throw new Error("Data transaksi atau product map tidak ditemukan")
      }

      const allTransactions = JSON.parse(storedTransactions)
      const productMap = JSON.parse(storedProductMap)

      // Get the latest date to calculate next week
      const latestDate = new Date(availableDates[0])
      
      for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
        // Calculate next week's date for this day
        const nextWeekDate = new Date(latestDate)
        const daysUntilNextWeek = 7 - latestDate.getDay() + dayOfWeek
        nextWeekDate.setDate(latestDate.getDate() + daysUntilNextWeek)
        
        // Filter transactions for the same day of week
        const sameDayTransactions = allTransactions.filter((transaction: any) => {
          if (!transaction.date) return false
          
          try {
            let transactionDate: Date
            if (transaction.date.includes('/')) {
              const [day, month, year] = transaction.date.split('/')
              transactionDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
            } else {
              transactionDate = new Date(transaction.date)
            }
            
            return transactionDate.getDay() === dayOfWeek
          } catch {
            return false
          }
        })

        if (sameDayTransactions.length > 0) {
          // Prepare data for analysis
          const analysisData = {
            transactions: sameDayTransactions,
            productMap: productMap,
            algorithm: params!.algorithm,
            minSupport: params!.minSupport,
            minConfidence: params!.minConfidence,
          }

          try {
            // Call analyze API
            const response = await fetch("/api/analyze", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(analysisData),
            })

            if (response.ok) {
              const result = await response.json()
              
              // Format the prediction date
              const predictionDateStr = `${nextWeekDate.getDate().toString().padStart(2, '0')}/${(nextWeekDate.getMonth() + 1).toString().padStart(2, '0')}/${nextWeekDate.getFullYear()}`
              
              predictions[dayNames[dayOfWeek]] = {
                dayName: dayNames[dayOfWeek],
                predictionDate: predictionDateStr,
                dataSource: `${sameDayTransactions.length} transaksi dari hari ${dayNames[dayOfWeek]} sebelumnya`,
                frequentItemsets: result.frequent_itemsets || [],
                associationRules: result.association_rules || [],
                transactionCount: sameDayTransactions.length,
                topBundles: result.association_rules ? 
                  result.association_rules
                    .sort((a: any, b: any) => b.lift - a.lift)
                    .slice(0, 5)
                    .map((rule: any, index: number) => {
                      const allItems = [...rule.antecedent, ...rule.consequent]
                      return {
                        rank: index + 1,
                        items: allItems.map((item: any) => item.name).join(" + "),
                        support: rule.support,
                        confidence: rule.confidence,
                        lift: rule.lift,
                        count: Math.round(rule.support * sameDayTransactions.length),
                      }
                    }) : []
              }
            }
          } catch (error) {
            console.error(`Error analyzing ${dayNames[dayOfWeek]}:`, error)
          }
        } else {
          const nextWeekDateStr = `${nextWeekDate.getDate().toString().padStart(2, '0')}/${(nextWeekDate.getMonth() + 1).toString().padStart(2, '0')}/${nextWeekDate.getFullYear()}`
          predictions[dayNames[dayOfWeek]] = {
            dayName: dayNames[dayOfWeek],
            predictionDate: nextWeekDateStr,
            dataSource: "Tidak ada data historis",
            error: `Tidak ada data transaksi untuk hari ${dayNames[dayOfWeek]} dalam dataset`
          }
        }
      }

      setWeeklyPredictions(predictions)
    } catch (error) {
      console.error("Error analyzing weekly predictions:", error)
      setWeeklyPredictionError(error instanceof Error ? error.message : "Terjadi kesalahan saat menganalisis prediksi mingguan")
    } finally {
      setWeeklyPredictionLoading(false)
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
                            <TableCell className="text-right">{(bundle.conference * 100).toFixed(2)}%</TableCell>
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
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="visualization">Visualisasi</TabsTrigger>
                  <TabsTrigger value="algorithm">Visualisasi Algoritma</TabsTrigger>
                  <TabsTrigger value="details">Detail Hasil</TabsTrigger>
                  {hasDateColumn && <TabsTrigger value="daily-pattern">Pola Harian</TabsTrigger>}
                  {hasDateColumn && <TabsTrigger value="weekly-prediction">Prediksi Minggu Depan</TabsTrigger>}
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
                        <CardTitle>Analisis Pola Bundling Berdasarkan Hari</CardTitle>
                        <CardDescription>
                          Analisis ini menggunakan semua data transaksi yang terjadi pada hari yang sama dalam seminggu. 
                          Contoh: Jika Anda memilih tanggal Senin 14/04/2025, sistem akan menganalisis semua data transaksi 
                          yang terjadi di hari Senin sepanjang periode dataset untuk menemukan pola bundling yang khas untuk hari Senin.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="bg-blue-50 p-4 rounded-lg border">
                          <h4 className="font-medium text-blue-800 mb-2">Cara Kerja Algoritma</h4>
                          <div className="text-sm text-blue-700 space-y-2">
                            <p><strong>1. Identifikasi Hari:</strong> Sistem mengidentifikasi hari dalam seminggu dari tanggal yang dipilih (Senin, Selasa, dst.)</p>
                            <p><strong>2. Filter Data:</strong> Mengumpulkan semua transaksi yang terjadi pada hari yang sama sepanjang periode dataset</p>
                            <p><strong>3. Analisis Market Basket:</strong> Menjalankan algoritma {params?.algorithm === "eclat" ? "Eclat" : "FP-Growth"} pada data yang telah difilter</p>
                            <p><strong>4. Hasil:</strong> Mendapatkan pola bundling yang spesifik untuk hari tersebut dengan parameter minimum support {params ? (params.minSupport * 100).toFixed(1) : 0}% dan confidence {params ? (params.minConfidence * 100).toFixed(1) : 0}%</p>
                          </div>
                        </div>

                        <div className="bg-green-50 p-4 rounded-lg border">
                          <h4 className="font-medium text-green-800 mb-2">Informasi Dataset</h4>
                          <p className="text-sm text-green-700">
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
                            Pilih Tanggal (Untuk Menentukan Hari dalam Seminggu):
                          </label>
                          <Select value={selectedDate} onValueChange={setSelectedDate}>
                            <SelectTrigger className="w-48">
                              <SelectValue placeholder="Pilih tanggal untuk menentukan hari..." />
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
                          <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                            <h5 className="font-medium text-yellow-800 mb-1">Analisis yang Akan Dilakukan:</h5>
                            <p className="text-sm text-yellow-700">
                              Sistem akan menganalisis semua transaksi yang terjadi pada hari {(() => {
                                const targetDateObj = new Date(selectedDate)
                                const dayName = targetDateObj.toLocaleDateString('id-ID', { weekday: 'long' })
                                return dayName
                              })()} dalam dataset untuk menemukan pola bundling produk yang khas untuk hari tersebut.
                            </p>
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
                                    Berdasarkan analisis {dailyPattern.transactionCount} transaksi yang terjadi pada hari {dailyPattern.date.split(' ')[0]} 
                                    menggunakan algoritma {params?.algorithm === "eclat" ? "Eclat" : "FP-Growth"}. 
                                    Hasil diurutkan berdasarkan nilai lift tertinggi yang menunjukkan kekuatan asosiasi antar produk.
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

                {hasDateColumn && (
                  <TabsContent value="weekly-prediction" className="mt-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Prediksi Bundling Minggu Depan</CardTitle>
                        <CardDescription>
                          Prediksi pola bundling untuk 7 hari ke depan berdasarkan analisis semua data historis 
                          untuk setiap hari dalam seminggu. Sistem menggunakan pola yang ditemukan dari hari yang sama 
                          (misalnya semua data Senin) untuk memprediksi rekomendasi bundling untuk Senin minggu depan.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="bg-green-50 p-4 rounded-lg border">
                          <h4 className="font-medium text-green-800 mb-2">Metodologi Prediksi</h4>
                          <div className="text-sm text-green-700 space-y-2">
                            <p><strong>1. Analisis Per Hari:</strong> Sistem menganalisis semua transaksi untuk setiap hari dalam seminggu secara terpisah</p>
                            <p><strong>2. Algoritma Machine Learning:</strong> Menggunakan {params?.algorithm === "eclat" ? "algoritma Eclat" : "algoritma FP-Growth"} untuk menemukan frequent itemsets dan association rules</p>
                            <p><strong>3. Ranking Berdasarkan Lift:</strong> Rekomendasi diurutkan berdasarkan nilai lift yang menunjukkan seberapa kuat hubungan antar produk</p>
                            <p><strong>4. Prediksi Akurat:</strong> Semakin banyak data historis untuk setiap hari, semakin akurat prediksi yang dihasilkan</p>
                          </div>
                          
                          <div className="mt-3 pt-3 border-t border-green-200">
                            <p className="text-sm text-green-700">
                              <strong>Periode Prediksi:</strong> {availableDates.length > 0 && (() => {
                                const latestDate = new Date(availableDates[0])
                                const nextMonday = new Date(latestDate)
                                const daysUntilMonday = 7 - latestDate.getDay() + 1
                                nextMonday.setDate(latestDate.getDate() + daysUntilMonday)
                                
                                const nextSunday = new Date(nextMonday)
                                nextSunday.setDate(nextMonday.getDate() + 6)
                                
                                const mondayDisplay = `${nextMonday.getDate().toString().padStart(2, '0')}/${(nextMonday.getMonth() + 1).toString().padStart(2, '0')}/${nextMonday.getFullYear()}`
                                const sundayDisplay = `${nextSunday.getDate().toString().padStart(2, '0')}/${(nextSunday.getMonth() + 1).toString().padStart(2, '0')}/${nextSunday.getFullYear()}`
                                
                                return `${mondayDisplay} - ${sundayDisplay}`
                              })()}
                            </p>
                          </div>
                        </div>

                        <div className="flex justify-center">
                            <Button
                            onClick={analyzeWeeklyPredictions}
                            disabled={weeklyPredictionLoading || availableDates.length === 0}
                            size="lg"
                            className="bg-green-600 hover:bg-green-700"
                          >
                            {weeklyPredictionLoading ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                                Menganalisis 7 Hari...
                              </>
                            ) : (
                              "🔮 Buat Prediksi Minggu Depan"
                            )}
                          </Button>
                        </div>

                        {weeklyPredictionError && (
                          <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{weeklyPredictionError}</AlertDescription>
                          </Alert>
                        )}

                        {Object.keys(weeklyPredictions).length > 0 && (
                          <div className="space-y-6">
                            <h3 className="text-lg font-medium">Prediksi Bundling per Hari</h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'].map((day) => {
                                const prediction = weeklyPredictions[day]
                                if (!prediction) return null

                                return (
                                  <Card key={day} className="h-full">
                                    <CardHeader className="pb-3">
                                      <CardTitle className="text-lg">{day}</CardTitle>
                                      <CardDescription>
                                        {prediction.predictionDate}
                                      </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                      <div className="text-xs text-muted-foreground">
                                        {prediction.dataSource}
                                      </div>

                                      {prediction.error ? (
                                        <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                                          {prediction.error}
                                        </div>
                                      ) : (
                                        <>
                                          <div className="grid grid-cols-2 gap-2 text-sm">
                                            <div>
                                              <span className="font-medium">Frequent Items:</span>
                                              <div className="text-blue-600">{prediction.frequentItemsets?.length || 0}</div>
                                            </div>
                                            <div>
                                              <span className="font-medium">Association Rules:</span>
                                              <div className="text-green-600">{prediction.associationRules?.length || 0}</div>
                                            </div>
                                          </div>

                                          {prediction.topBundles && prediction.topBundles.length > 0 && (
                                            <div>
                                              <div className="font-medium text-sm mb-2">Top 3 Rekomendasi:</div>
                                              <div className="space-y-1">
                                                {prediction.topBundles.slice(0, 3).map((bundle: any, idx: number) => (
                                                  <div key={idx} className="text-xs p-2 bg-slate-50 rounded">
                                                    <div className="font-medium">{bundle.items}</div>
                                                    <div className="text-muted-foreground">
                                                      Lift: {bundle.lift.toFixed(2)} | Confidence: {(bundle.confidence * 100).toFixed(1)}%
                                                    </div>
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          )}
                                        </>
                                      )}
                                    </CardContent>
                                  </Card>
                                )
                              })}
                            </div>

                            {/* Detailed weekly summary */}
                            <Card>
                              <CardHeader>
                                <CardTitle>Ringkasan Prediksi Mingguan</CardTitle>
                                <CardDescription>
                                  Kombinasi terbaik untuk setiap hari dalam minggu depan
                                </CardDescription>
                              </CardHeader>
                              <CardContent>
                                <div className="border rounded-md overflow-auto">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Hari</TableHead>
                                        <TableHead>Tanggal</TableHead>
                                        <TableHead>Rekomendasi Utama</TableHead>
                                        <TableHead className="text-right">Lift</TableHead>
                                        <TableHead className="text-right">Confidence</TableHead>
                                        <TableHead>Data Source</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'].map((day) => {
                                        const prediction = weeklyPredictions[day]
                                        if (!prediction) return null

                                        const topBundle = prediction.topBundles?.[0]
                                        
                                        return (
                                          <TableRow key={day}>
                                            <TableCell className="font-medium">{day}</TableCell>
                                            <TableCell>{prediction.predictionDate}</TableCell>
                                            <TableCell>
                                              {prediction.error ? (
                                                <span className="text-red-600 text-sm">Tidak ada data</span>
                                              ) : topBundle ? (
                                                <span className="text-sm">{topBundle.items}</span>
                                              ) : (
                                                <span className="text-muted-foreground text-sm">Tidak ada rekomendasi</span>
                                              )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                              {topBundle ? topBundle.lift.toFixed(2) : '-'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                              {topBundle ? (topBundle.confidence * 100).toFixed(1) + '%' : '-'}
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                              {prediction.transactionCount ? `${prediction.transactionCount} transaksi` : 'Tidak ada data'}
                                            </TableCell>
                                          </TableRow>
                                        )
                                      })}
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
