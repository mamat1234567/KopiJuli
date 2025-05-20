"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Slider } from "@/components/ui/slider"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, ArrowRight, Loader2, GitCompare } from "lucide-react"
import { fetchFromBackend } from "../api/backend-config"

export default function AlgorithmPage() {
  const router = useRouter()
  const [algorithm, setAlgorithm] = useState("eclat")
  const [minSupport, setMinSupport] = useState(0.01) // 1%
  const [minConfidence, setMinConfidence] = useState(0.2) // 20%
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState({
    totalTransactions: 0,
    totalProducts: 0,
  })

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

  // Update the handleRunAlgorithm function to clear previous results before running a new algorithm
  const handleRunAlgorithm = async () => {
    try {
      setLoading(true)
      setError(null)

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

      // Clear previous results to ensure we don't mix results from different algorithms
      localStorage.removeItem("frequentItemsets")
      localStorage.removeItem("associationRules")
      localStorage.removeItem("algorithmParams")
      localStorage.removeItem("processLogs")
      localStorage.removeItem("comparisonData")

      console.log(`Running algorithm: ${algorithm} with minSupport: ${minSupport} and minConfidence: ${minConfidence}`)

      // Send request to analyze API
      const response = await fetchFromBackend("/api/analyze", {
        method: "POST",
        body: JSON.stringify({
          transactions,
          productMap,
          algorithm,
          minSupport,
          minConfidence,
          compareAlgorithms: false,
        }),
      })

      if (!response.success) {
        throw new Error(response.message || response.error || "Terjadi kesalahan saat menganalisis data")
      }

      // Store results in localStorage for the results page
      localStorage.setItem("frequentItemsets", JSON.stringify(response.frequent_itemsets))
      localStorage.setItem("associationRules", JSON.stringify(response.association_rules))
      localStorage.setItem("algorithmParams", JSON.stringify(response.algorithm_params))

      // Store process logs if available
      if (response.process_logs) {
        localStorage.setItem("processLogs", JSON.stringify(response.process_logs))
      }

      // Navigate to results page
      router.push("/results")
    } catch (err) {
      console.error("Error running algorithm:", err)
      setError(err instanceof Error ? err.message : "Terjadi kesalahan saat menganalisis data")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle>Pemilihan Algoritma</CardTitle>
          <CardDescription>Pilih algoritma dan parameter untuk analisis pola pembelian</CardDescription>
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

          <div className="flex justify-center mb-4">
            <Button variant="outline" className="w-full max-w-md" onClick={() => router.push("/comparison")}>
              <GitCompare className="mr-2 h-4 w-4" />
              Bandingkan Kedua Algoritma
            </Button>
          </div>

          <Tabs defaultValue="algorithm">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="algorithm">Algoritma</TabsTrigger>
              <TabsTrigger value="parameters">Parameter</TabsTrigger>
            </TabsList>
            <TabsContent value="algorithm" className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Pilih Algoritma</h3>
                <RadioGroup defaultValue="eclat" value={algorithm} onValueChange={setAlgorithm}>
                  <div className="flex items-start space-x-2 p-3 rounded-md border">
                    <RadioGroupItem value="eclat" id="eclat" />
                    <div className="grid gap-1.5">
                      <Label htmlFor="eclat" className="font-medium">
                        Eclat (Equivalence Class Transformation)
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Algoritma yang menggunakan representasi vertikal database dan pendekatan depth-first search
                        untuk menemukan frequent itemsets.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2 p-3 rounded-md border mt-2">
                    <RadioGroupItem value="fpgrowth" id="fpgrowth" />
                    <div className="grid gap-1.5">
                      <Label htmlFor="fpgrowth" className="font-medium">
                        FP-Growth (Frequent Pattern Growth)
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Algoritma yang menggunakan struktur data FP-Tree untuk menemukan frequent itemsets tanpa
                        menghasilkan kandidat.
                      </p>
                    </div>
                  </div>
                </RadioGroup>
              </div>
            </TabsContent>
            <TabsContent value="parameters" className="space-y-4">
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
                    Minimum support menentukan seberapa sering itemset harus muncul dalam dataset untuk dianggap
                    frequent. Nilai yang lebih rendah akan menghasilkan lebih banyak pola tetapi mungkin kurang
                    signifikan.
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
                  <p className="text-xs text-muted-foreground">
                    Minimum confidence menentukan kekuatan aturan asosiasi. Nilai yang lebih tinggi menghasilkan aturan
                    yang lebih dapat diandalkan.
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => router.push("/preprocessing")}>
            Kembali
          </Button>
          <Button onClick={handleRunAlgorithm} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Memproses...
              </>
            ) : (
              <>
                Jalankan Algoritma
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
