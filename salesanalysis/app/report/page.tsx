"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, FileDown, Home } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"

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

export default function ReportPage() {
  const router = useRouter()
  const reportRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [frequentItemsets, setFrequentItemsets] = useState<FrequentItemset[]>([])
  const [associationRules, setAssociationRules] = useState<AssociationRule[]>([])
  const [params, setParams] = useState<AlgorithmParams | null>(null)
  const [topBundlingOptions, setTopBundlingOptions] = useState<any[]>([])
  const [currentDate, setCurrentDate] = useState<string>("")

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
      // Set current date
      const date = new Date()
      setCurrentDate(
        date.toLocaleDateString("id-ID", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
      )

      // Load algorithm parameters
      const storedParams = localStorage.getItem("algorithmParams")
      if (!storedParams) {
        setError("Parameter algoritma tidak ditemukan")
        setLoading(false)
        return
      }

      const parsedParams = JSON.parse(storedParams) as AlgorithmParams
      setParams(parsedParams)

      // Load frequent itemsets
      const storedItemsets = localStorage.getItem("frequentItemsets")
      if (!storedItemsets) {
        setError("Hasil analisis tidak ditemukan")
        setLoading(false)
        return
      }

      const parsedItemsets = JSON.parse(storedItemsets) as FrequentItemset[]
      setFrequentItemsets(parsedItemsets)

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

      // Prepare top bundling options (rules with highest lift and multiple items)
      prepareTopBundlingOptions(sortedRules, parsedParams.transactionCount)

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

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border rounded shadow-lg">
          <p className="font-bold">{payload[0].payload.items || payload[0].payload.name}</p>
          <p>Support: {payload[0].payload.support * 100}%</p>
          {payload[0].payload.confidence !== undefined && <p>Confidence: {payload[0].payload.confidence * 100}%</p>}
          {payload[0].payload.lift !== undefined && <p>Lift: {payload[0].payload.lift}</p>}
          <p>Jumlah: {payload[0].payload.count} transaksi</p>
        </div>
      )
    }
    return null
  }

  const exportToPDF = async () => {
    try {
      // Dynamically import html2pdf.js
      const script = document.createElement("script")
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"
      script.async = true

      script.onload = () => {
        if (reportRef.current && window.html2pdf) {
          const opt = {
            margin: 10,
            filename: `laporan_bundling_${params?.algorithm || "algorithm"}_${new Date().toISOString().split("T")[0]}.pdf`,
            image: { type: "jpeg", quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
          }

          window.html2pdf().set(opt).from(reportRef.current).save()
        } else {
          alert("Terjadi kesalahan saat mengekspor PDF. Silakan coba lagi.")
        }
      }

      script.onerror = () => {
        alert("Gagal memuat library PDF. Silakan coba lagi nanti.")
      }

      document.body.appendChild(script)
    } catch (err) {
      console.error("Error exporting PDF:", err)
      alert("Terjadi kesalahan saat mengekspor PDF")
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle>Laporan Rekomendasi Bundling Produk</CardTitle>
          <CardDescription>
            Hasil analisis data transaksi menggunakan{" "}
            {params?.algorithm === "eclat" ? "Algoritma Eclat" : "Algoritma FP-Growth"}
          </CardDescription>
        </CardHeader>
        <CardContent>
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
              <p className="text-lg font-medium text-slate-700">Memuat laporan...</p>
            </div>
          ) : (
            <>
              <div className="flex justify-end space-x-2 mb-4">
                <Button variant="outline" onClick={() => router.push("/results")}>
                  Kembali ke Hasil
                </Button>
                <Button onClick={exportToPDF}>
                  <FileDown className="mr-2 h-4 w-4" />
                  Ekspor PDF
                </Button>
              </div>

              <div ref={reportRef} className="bg-white p-6 rounded-lg border">
                {/* Report Header */}
                <div className="text-center mb-6">
                  <h1 className="text-2xl font-bold">Laporan Rekomendasi Bundling Produk</h1>
                  <p className="text-gray-500">{currentDate}</p>
                </div>

                {/* Summary */}
                <div className="mb-6">
                  <h2 className="text-xl font-semibold mb-3">Ringkasan Analisis</h2>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="bg-slate-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-500">Total Transaksi</p>
                      <p className="text-2xl font-bold">{params?.transactionCount}</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-500">Total Produk</p>
                      <p className="text-2xl font-bold">{params?.productCount}</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-500">Pola Ditemukan</p>
                      <p className="text-2xl font-bold">{frequentItemsets.length}</p>
                    </div>
                  </div>
                  <p className="text-sm">
                    Analisis dilakukan menggunakan{" "}
                    <span className="font-semibold">
                      {params?.algorithm === "eclat" ? "Algoritma Eclat" : "Algoritma FP-Growth"}
                    </span>{" "}
                    dengan minimum support <span className="font-semibold">{(params?.minSupport || 0) * 100}%</span> dan
                    minimum confidence <span className="font-semibold">{(params?.minConfidence || 0) * 100}%</span>.
                  </p>
                </div>

                <Separator className="my-6" />

                {/* Top 10 Bundling Recommendations */}
                <div className="mb-6">
                  <h2 className="text-xl font-semibold mb-3">Top 10 Rekomendasi Bundling Produk</h2>
                  <p className="text-sm text-gray-500 mb-4">
                    Rekomendasi bundling produk berdasarkan nilai lift tertinggi. Semakin tinggi nilai lift, semakin
                    kuat hubungan antar produk.
                  </p>

                  <div className="overflow-hidden rounded-lg border mb-6">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">No</TableHead>
                          <TableHead>Produk</TableHead>
                          <TableHead className="text-right">Support</TableHead>
                          <TableHead className="text-right">Confidence</TableHead>
                          <TableHead className="text-right">Lift</TableHead>
                          <TableHead className="text-right">Jumlah</TableHead>
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

                  {/* Visualization */}
                  <div className="mb-4">
                    <h3 className="text-lg font-medium mb-4">Visualisasi Rekomendasi</h3>

                    <div className="border rounded-md p-4 bg-white">
                      <div className="h-[400px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={topBundlingOptions}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              outerRadius={150}
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

                      <div className="border rounded-md p-4 bg-slate-50 mt-4 max-h-60 overflow-auto">
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
                  </div>
                </div>

                <Separator className="my-6" />

                {/* Recommendations */}
                <div className="mb-6">
                  <h2 className="text-xl font-semibold mb-3">Rekomendasi Strategi Pemasaran</h2>
                  <div className="space-y-4">
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                      <h3 className="font-medium text-blue-800 mb-2">Bundling Produk</h3>
                      <p className="text-sm">
                        Berdasarkan analisis, produk-produk berikut memiliki asosiasi yang kuat dan dapat dijual sebagai
                        paket bundling:
                      </p>
                      <ul className="list-disc list-inside mt-2 text-sm">
                        {topBundlingOptions.slice(0, 3).map((bundle, index) => (
                          <li key={index}>
                            <span className="font-medium">{bundle.items}</span> - Lift: {bundle.lift.toFixed(2)}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                      <h3 className="font-medium text-green-800 mb-2">Strategi Cross-Selling</h3>
                      <p className="text-sm">
                        Produk-produk berikut dapat dipromosikan bersama untuk meningkatkan penjualan melalui strategi
                        cross-selling:
                      </p>
                      <ul className="list-disc list-inside mt-2 text-sm">
                        {associationRules.slice(0, 3).map((rule, index) => (
                          <li key={index}>
                            Ketika pelanggan membeli{" "}
                            <span className="font-medium">{rule.antecedent.map((item) => item.name).join(", ")}</span>,
                            tawarkan{" "}
                            <span className="font-medium">{rule.consequent.map((item) => item.name).join(", ")}</span> -
                            Confidence: {(rule.confidence * 100).toFixed(2)}%
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                      <h3 className="font-medium text-purple-800 mb-2">Tata Letak Produk</h3>
                      <p className="text-sm">
                        Pertimbangkan untuk menempatkan produk-produk berikut berdekatan di toko fisik atau halaman web:
                      </p>
                      <ul className="list-disc list-inside mt-2 text-sm">
                        {topBundlingOptions.slice(3, 6).map((bundle, index) => (
                          <li key={index}>{bundle.items}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="text-center text-sm text-gray-500 mt-8">
                  <p>Laporan ini dibuat secara otomatis berdasarkan analisis data transaksi.</p>
                  <p>© {new Date().getFullYear()} Sistem Analisis Penjualan</p>
                </div>
              </div>
            </>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => router.push("/results")}>
            Kembali ke Hasil
          </Button>
          <Button onClick={() => router.push("/")}>
            <Home className="mr-2 h-4 w-4" />
            Halaman Utama
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
