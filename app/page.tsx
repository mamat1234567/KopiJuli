"use client"

import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, Loader2 } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"

interface MenuItem {
  menu: string
  harga: number
}

export default function Home() { 
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchMenuData()
  }, [])

  const fetchMenuData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/menu')
      const result = await response.json()
      
      if (result.success) {
        setMenuItems(result.data)
      } else {
        setError(result.error || 'Gagal memuat data menu')
      }
    } catch (err) {
      setError('Gagal terhubung ke server')
      console.error('Error fetching menu:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] bg-gradient-to-b from-slate-50 to-slate-100 p-4">
      <div className="max-w-3xl w-full text-center space-y-8">
        <h1 className="text-4xl font-bold tracking-tight">Analisis Penjualan dengan Data</h1>
        <p className="text-lg text-slate-600">
          Unggah data penjualan Anda dalam format CSV untuk menemukan pola pembelian dan rekomendasi bundling produk
          menggunakan algoritma data mining.
        </p>
        <div className="flex flex-col items-center gap-4">
          <Link href="/upload" className="w-full max-w-xs">
            <Button size="lg" className="w-full gap-2">
              Mulai dengan Upload File
              <Upload className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        {/* Table Menu */}
        <div className="mt-8 max-w-md mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Menu</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  <span>Memuat data menu...</span>
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <p className="text-red-500 mb-2">{error}</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={fetchMenuData}
                  >
                    Coba Lagi
                  </Button>
                </div>
              ) : menuItems.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Belum ada data menu
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-center">Menu</TableHead>
                      <TableHead className="text-center">Harga</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {menuItems.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="text-center">{item.menu}</TableCell>
                        <TableCell className="text-center">Rp {item.harga.toLocaleString('id-ID')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
