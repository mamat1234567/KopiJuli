import { Button } from "@/components/ui/button"
import { Upload } from "lucide-react"
import Link from "next/link"

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-4">
      <div className="max-w-3xl w-full text-center space-y-8">
        <h1 className="text-4xl font-bold tracking-tight">Analisis Penjualan dengan Bigel</h1>
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
      </div>
    </div>
  )
}
