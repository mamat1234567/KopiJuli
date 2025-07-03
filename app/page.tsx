import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload } from "lucide-react"
import Link from "next/link"

export default function Home() { 
  const menuItems = [
    { menu: "kopi", harga: 15000 },
    { menu: "pisang goreng", harga: 20000 }
  ]

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] bg-gradient-to-b from-slate-50 to-slate-100 p-4">
      <div className="max-w-3xl w-full text-center space-y-8">
        <h1 className="text-4xl font-bold tracking-tight">Analisis Penjualan dengan Data Mining</h1>
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
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
