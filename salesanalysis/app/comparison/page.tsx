"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, ArrowRight, Loader2, BarChart2, Play } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { fetchFromBackend } from "../api/backend-config"

export default function ComparisonPage() {
  const router = useRouter()
  const [minSupport, setMinSupport] = useState(0.01) // 1%
  const [minConfidence, setMinConfidence] = useState(0.2) // 20%
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState({
    totalTransactions: 0,
    totalProducts: 0,
  })
  const [processLogs, setProcessLogs] = useState<Record<string, string[]>>({
    eclat: [],
    fpgrowth: [],
  })
  const [currentStep, setCurrentStep] = useState<number>({
    eclat: 0,
    fpgrowth: 0,
  })
  const [isRunning, setIsRunning] = useState<Record<string, boolean>>({
    eclat: false,
    fpgrowth: false,
  })
  const [comparisonData, setComparisonData] = useState(null)

  useEffect(() => {
    // Load stats from localStorage
    const totalTransactions = localStorage.getItem("totalTransactions")
    const totalProducts = localStorage.getItem("totalProducts")

    if (totalTransactions && totalProducts) {
      setStats({
        totalTransactions: Number.parseInt(totalTransactions),
        totalProducts: Number.parseInt(totalProducts),
      })
    }
  }, [])

  const runComparison = async () => {
    try {
      setLoading(true)
      setError(null)
      setProcessLogs({ eclat: [], fpgrowth: [] })
      setCurrentStep({ eclat: 0, fpgrowth: 0 })
      setIsRunning({ eclat: false, fpgrowth: false })
      setComparisonData(null)

      // Get transactions and product map from localStorage
      const transactionsJson = localStorage.getItem("transactions")
      const productMapJson = localStorage.getItem("productMap")

      if (!transactionsJson || !productMapJson) {
        setError("Data transaksi tidak ditemukan. Silakan unggah dan proses data terlebih dahulu.")
        setLoading(false)
        return
      }

      const transactions = JSON.parse(transactionsJson)
      const productMap = JSON.parse(productMapJson)

      // Clear previous results
      localStorage.removeItem("comparisonData")
      localStorage.removeItem("processLogs")

      console.log(`Running comparison with minSupport: ${minSupport} and minConfidence: ${minConfidence}`)

      // Send request to analyze API with compareAlgorithms flag
      const response = await fetchFromBackend("/api/analyze", {
        method: "POST",
        body: JSON.stringify({
          transactions,
          productMap,
          algorithm: "eclat", // Default algorithm, but we'll run both
          minSupport,
          minConfidence,
          compareAlgorithms: true,
        }),
      })

      if (!response.success) {
        throw new Error(response.message || response.error || "Terjadi kesalahan saat menganalisis data")
      }

      // Store process logs and comparison data
      if (response.process_logs) {
        setProcessLogs(response.process_logs)
        localStorage.setItem("processLogs", JSON.stringify(response.process_logs))
      }

      if (response.comparison_data) {
        setComparisonData(response.comparison_data)
        localStorage.setItem("comparisonData", JSON.stringify(response.comparison_data))
      }

      setLoading(false)
    } catch (err) {
      console.error("Error running comparison:", err)
      setError(err instanceof Error ? err.message : "Terjadi kesalahan saat membandingkan algoritma")
      setLoading(false)
    }
  }

  const simulateAlgorithm = (algorithm) => {
    if (processLogs[algorithm] && processLogs[algorithm].length > 0) {
      setIsRunning((prev) => ({ ...prev, [algorithm]: true }))
      setCurrentStep((prev) => ({ ...prev, [algorithm]: 0 }))

      const interval = setInterval(() => {
        setCurrentStep((prev) => {
          const nextStep = prev[algorithm] + 1
          if (nextStep >= processLogs[algorithm].length) {
            clearInterval(interval)
            setIsRunning((p) => ({ ...p, [algorithm]: false }))
            return { ...prev, [algorithm]: processLogs[algorithm].length }
          }
          return { ...prev, [algorithm]: nextStep }
        })
      }, 500) // Adjust speed as needed
    }
  }

  // Prepare data for FP-Tree visualization
  const prepareFPTreeData = () => {
    // This is a simplified representation of an FP-Tree
    return {
      name: "Root",
      children: [
        {
          name: "Item A (10)",
          children: [
            {
              name: "Item B (8)",
              children: [{ name: "Item C (5)" }, { name: "Item D (3)" }],
            },
            { name: "Item E (2)" },
          ],
        },
        {
          name: "Item F (7)",
          children: [{ name: "Item G (6)" }, { name: "Item H (1)" }],
        },
      ],
    }
  }

  // Prepare data for Eclat visualization (TID-lists)
  const prepareEclatData = () => {
    return [
      { item: "Item A", tids: [1, 2, 3, 5, 7, 9] },
      { item: "Item B", tids: [1, 2, 4, 5, 8] },
      { item: "Item C", tids: [1, 3, 5, 7] },
      { item: "Item D", tids: [2, 4, 6, 8] },
      { item: "Item E", tids: [3, 5, 7, 9] },
    ]
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle>Perbandingan Algoritma</CardTitle>
          <CardDescription>
            Bandingkan kinerja dan proses algoritma Eclat dan FP-Growth dengan parameter yang sama
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

          <div className="space-y-2">
            <h3 className="text-lg font-medium">Ringkasan Data</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-3 rounded-md">
                <p className="text-sm font-medium">Total Transaksi</p>
                <p className="text-2xl font-bold">{stats.totalTransactions}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-md">
                <p className="text-sm font-medium">Total Produk Unik</p>
                <p className="text-2xl font-bold">{stats.totalProducts}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Parameter Perbandingan</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Minimum Support</Label>
                  <span className="text-sm font-medium">{(minSupport * 100).toFixed(1)}%</span>
                </div>
                <Slider
                  value={[minSupport]}
                  min={0.001}
                  max={0.5}
                  step={0.001}
                  onValueChange={(value) => setMinSupport(value[0])}
                />
                <p className="text-xs text-muted-foreground">
                  Minimum support menentukan seberapa sering itemset harus muncul dalam dataset untuk dianggap frequent.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Minimum Confidence</Label>
                  <span className="text-sm font-medium">{(minConfidence * 100).toFixed(1)}%</span>
                </div>
                <Slider
                  value={[minConfidence]}
                  min={0.01}
                  max={1}
                  step={0.01}
                  onValueChange={(value) => setMinConfidence(value[0])}
                />
                <p className="text-xs text-muted-foreground">Minimum confidence menentukan kekuatan aturan asosiasi.</p>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={runComparison} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  <>
                    <BarChart2 className="mr-2 h-4 w-4" />
                    Jalankan Perbandingan
                  </>
                )}
              </Button>
            </div>
          </div>

          {(processLogs.eclat.length > 0 || processLogs.fpgrowth.length > 0) && (
            <Tabs defaultValue="process">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="process">Proses Algoritma</TabsTrigger>
                <TabsTrigger value="visualization">Visualisasi Algoritma</TabsTrigger>
              </TabsList>

              <TabsContent value="process" className="mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Eclat Process */}
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-md font-medium">Algoritma Eclat</CardTitle>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => simulateAlgorithm("eclat")}
                          disabled={isRunning.eclat || processLogs.eclat.length === 0}
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Simulasi
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[300px] w-full rounded-md border p-4">
                        {processLogs.eclat && processLogs.eclat.length > 0 ? (
                          <div className="space-y-2">
                            {processLogs.eclat.slice(0, currentStep.eclat + 1).map((log, index) => (
                              <div
                                key={index}
                                className={`text-sm ${index === currentStep.eclat ? "bg-yellow-100 p-1 rounded" : ""}`}
                              >
                                <span className="text-slate-500">[{index + 1}]</span> {log}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-slate-500">
                            Jalankan perbandingan untuk melihat proses algoritma Eclat.
                          </p>
                        )}
                      </ScrollArea>
                    </CardContent>
                  </Card>

                  {/* FP-Growth Process */}
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-md font-medium">Algoritma FP-Growth</CardTitle>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => simulateAlgorithm("fpgrowth")}
                          disabled={isRunning.fpgrowth || processLogs.fpgrowth.length === 0}
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Simulasi
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[300px] w-full rounded-md border p-4">
                        {processLogs.fpgrowth && processLogs.fpgrowth.length > 0 ? (
                          <div className="space-y-2">
                            {processLogs.fpgrowth.slice(0, currentStep.fpgrowth + 1).map((log, index) => (
                              <div
                                key={index}
                                className={`text-sm ${
                                  index === currentStep.fpgrowth ? "bg-yellow-100 p-1 rounded" : ""
                                }`}
                              >
                                <span className="text-slate-500">[{index + 1}]</span> {log}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-slate-500">
                            Jalankan perbandingan untuk melihat proses algoritma FP-Growth.
                          </p>
                        )}
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="visualization" className="mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Eclat Visualization - TID-lists */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-md font-medium">Visualisasi Eclat (TID-lists)</CardTitle>
                      <CardDescription>
                        Representasi vertikal database dengan TID-lists untuk setiap item
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="border rounded-md p-4 bg-white">
                        <div className="space-y-4">
                          {prepareEclatData().map((item, index) => (
                            <div key={index} className="space-y-1">
                              <div className="font-medium">{item.item}</div>
                              <div className="flex flex-wrap gap-1">
                                {item.tids.map((tid) => (
                                  <div key={tid} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-xs">
                                    TID: {tid}
                                  </div>
                                ))}
                              </div>
                              <div className="text-xs text-slate-500">
                                Support: {((item.tids.length / stats.totalTransactions) * 100).toFixed(1)}%
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* FP-Growth Visualization - FP-Tree */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-md font-medium">Visualisasi FP-Growth (FP-Tree)</CardTitle>
                      <CardDescription>
                        Struktur FP-Tree yang digunakan untuk menemukan frequent patterns
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="border rounded-md p-4 bg-white">
                        <div className="h-[300px] overflow-auto">
                          <div className="pl-4 border-l-2 border-slate-300">
                            <div className="font-bold">Root</div>
                            <div className="pl-4 mt-2 border-l-2 border-slate-300">
                              <div className="font-medium">Item A (10)</div>
                              <div className="pl-4 mt-2 border-l-2 border-slate-300">
                                <div className="font-medium">Item B (8)</div>
                                <div className="pl-4 mt-2 border-l-2 border-slate-300">
                                  <div>Item C (5)</div>
                                </div>
                                <div className="pl-4 mt-2 border-l-2 border-slate-300">
                                  <div>Item D (3)</div>
                                </div>
                              </div>
                              <div className="pl-4 mt-2 border-l-2 border-slate-300">
                                <div>Item E (2)</div>
                              </div>
                            </div>
                            <div className="pl-4 mt-2 border-l-2 border-slate-300">
                              <div className="font-medium">Item F (7)</div>
                              <div className="pl-4 mt-2 border-l-2 border-slate-300">
                                <div>Item G (6)</div>
                              </div>
                              <div className="pl-4 mt-2 border-l-2 border-slate-300">
                                <div>Item H (1)</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          )}

          {comparisonData && (
            <Card>
              <CardHeader>
                <CardTitle className="text-md font-medium">Hasil Perbandingan</CardTitle>
                <CardDescription>
                  Perbandingan kinerja algoritma Eclat dan FP-Growth dengan parameter yang sama
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-3 rounded-md">
                      <p className="text-sm font-medium">Eclat - Waktu Eksekusi</p>
                      <p className="text-xl font-bold">{comparisonData.eclat.executionTime.toFixed(2)} ms</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-md">
                      <p className="text-sm font-medium">FP-Growth - Waktu Eksekusi</p>
                      <p className="text-xl font-bold">{comparisonData.fpgrowth.executionTime.toFixed(2)} ms</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-md">
                      <p className="text-sm font-medium">Eclat - Jumlah Itemsets</p>
                      <p className="text-xl font-bold">{comparisonData.eclat.itemsetCount}</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-md">
                      <p className="text-sm font-medium">FP-Growth - Jumlah Itemsets</p>
                      <p className="text-xl font-bold">{comparisonData.fpgrowth.itemsetCount}</p>
                    </div>
                  </div>

                  <div className="text-sm space-y-2">
                    <h4 className="font-medium">Kesimpulan:</h4>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>
                        {comparisonData.eclat.executionTime < comparisonData.fpgrowth.executionTime
                          ? "Eclat lebih cepat untuk dataset ini, tetapi perbedaannya mungkin bervariasi tergantung ukuran dan karakteristik data."
                          : "FP-Growth lebih cepat untuk dataset ini, yang sesuai dengan ekspektasi untuk dataset yang lebih besar."}
                      </li>
                      <li>
                        {comparisonData.eclat.itemsetCount === comparisonData.fpgrowth.itemsetCount
                          ? "Kedua algoritma menemukan jumlah itemsets yang sama, menunjukkan keduanya sama-sama efektif."
                          : comparisonData.eclat.itemsetCount > comparisonData.fpgrowth.itemsetCount
                            ? "Eclat menemukan lebih banyak itemsets, yang mungkin menunjukkan pendekatan vertikal lebih efektif untuk dataset ini."
                            : "FP-Growth menemukan lebih banyak itemsets, yang mungkin menunjukkan pendekatan berbasis tree lebih efektif untuk dataset ini."}
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => router.push("/algorithm")}>
            Kembali
          </Button>
          <Button onClick={() => router.push("/results")} disabled={!comparisonData}>
            Lihat Hasil Detail
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
