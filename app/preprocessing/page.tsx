"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, ArrowRight, Database } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { fetchFromBackend } from "../api/backend-config"

interface Transaction {
  invoiceNo: string
  items: {
    id: string
    name: string
  }[]
}

export default function PreprocessingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [rawData, setRawData] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [stats, setStats] = useState({
    totalTransactions: 0,
    totalProducts: 0,
    totalItems: 0,
  })
  const [productMap, setProductMap] = useState<Record<string, string>>({})

  useEffect(() => {
    const processData = async () => {
      try {
        // Dapatkan CSV content dari localStorage
        const csvContent = localStorage.getItem("csvContent")

        if (!csvContent) {
          setError("Data CSV tidak ditemukan. Silakan unggah file terlebih dahulu.")
          setLoading(false)
          return
        }

        setProgress(10)

        // Kirim permintaan ke serverless function untuk memproses data
        const response = await fetchFromBackend("/api/preprocess", {
          method: "POST",
          body: JSON.stringify({
            csvContent: csvContent,
          }),
        })

        if (!response.success) {
          throw new Error(response.error || "Terjadi kesalahan saat memproses data")
        }

        setProgress(80)

        // Perbarui state dengan data yang dikembalikan dari backend
        setRawData(response.raw_data_preview || [])
        setTransactions(response.processed_preview || [])
        setStats({
          totalTransactions: response.stats.totalTransactions || 0,
          totalProducts: response.stats.totalProducts || 0,
          totalItems: response.stats.totalItems || 0,
        })

        // Simpan data transaksi dan product map di localStorage untuk digunakan di halaman algoritma
        localStorage.setItem("transactions", JSON.stringify(response.transactions))
        localStorage.setItem("productMap", JSON.stringify(response.product_map))
        localStorage.setItem("totalTransactions", String(response.stats.totalTransactions))
        localStorage.setItem("totalProducts", String(response.stats.totalProducts))

        setProductMap(response.product_map || {})
        setProgress(100)
        setLoading(false)
      } catch (err) {
        console.error("Error processing data:", err)
        setError(err instanceof Error ? err.message : "Terjadi kesalahan saat memproses data")
        setLoading(false)
      }
    }

    processData()
  }, [])

  const handleContinue = () => {
    router.push("/algorithm")
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle>Pra-Pemrosesan Data</CardTitle>
          <CardDescription>Transformasi data penjualan menjadi format transaksi untuk analisis</CardDescription>
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
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <Database className="h-8 w-8 text-slate-400" />
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-medium">Memproses Data</p>
                  <Progress value={progress} />
                </div>
              </div>
              <p className="text-sm text-slate-500">Membersihkan dan mengubah data menjadi format transaksi...</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-2">Data Mentah (10 baris pertama)</h3>
                <div className="border rounded-md overflow-auto max-h-60">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {rawData.length > 0 &&
                          Object.keys(rawData[0]).map((header, index) => <TableHead key={index}>{header}</TableHead>)}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rawData.map((row, index) => (
                        <TableRow key={index}>
                          {Object.values(row).map((value: any, cellIndex) => (
                            <TableCell key={cellIndex}>{String(value)}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">Data Transaksi (Hasil Transformasi)</h3>
                <div className="border rounded-md overflow-auto max-h-60">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>No Invoice</TableHead>
                        <TableHead>Items</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((transaction, index) => (
                        <TableRow key={index}>
                          <TableCell>{transaction.invoiceNo || transaction.no_invoice || "-"}</TableCell>
                          <TableCell>
                            {Array.isArray(transaction.items)
                              ? transaction.items.map((item: any) => item.name).join(", ")
                              : Array.isArray(transaction.product_name_col)
                                ? transaction.product_name_col.join(", ")
                                : "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div className="bg-slate-50 p-3 rounded-md">
                    <p className="text-sm font-medium">Total Transaksi</p>
                    <p className="text-2xl font-bold">{stats.totalTransactions}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-md">
                    <p className="text-sm font-medium">Total Produk Unik</p>
                    <p className="text-2xl font-bold">{stats.totalProducts}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-md">
                    <p className="text-sm font-medium">Total Item</p>
                    <p className="text-2xl font-bold">{stats.totalItems}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => router.push("/upload")}>
            Kembali
          </Button>
          <Button onClick={handleContinue} disabled={loading || transactions.length === 0}>
            Lanjut ke Pemilihan Algoritma
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
