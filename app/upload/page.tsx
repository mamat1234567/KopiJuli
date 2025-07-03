"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, FileUp, Upload } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { fetchFromBackend } from "../api/backend-config"

export default function UploadPage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    setError(null)

    if (!selectedFile) {
      return
    }

    if (!selectedFile.name.toLowerCase().endsWith(".csv")) {
      setError("File harus dalam format CSV")
      return
    }

    setFile(selectedFile)
  }

  const handleUpload = async () => {
    if (!file) {
      setError("Silakan pilih file terlebih dahulu")
      return
    }

    setUploading(true)
    setProgress(10)

    try {
      // Baca file sebagai base64
      const fileData = await readFileAsBase64(file)
      setProgress(30)

      // Kirim data file ke serverless function
      const response = await fetchFromBackend("/api/upload", {
        method: "POST",
        body: JSON.stringify({ fileData }),
      })

      setProgress(70)

      if (!response.success) {
        throw new Error(response.error || "Terjadi kesalahan saat mengunggah file")
      }

      // Simpan data CSV di localStorage untuk digunakan di halaman berikutnya
      localStorage.setItem("sessionId", response.session_id)
      localStorage.setItem("csvContent", response.csv_content)

      setProgress(100)

      // Arahkan ke halaman preprocessing
      setTimeout(() => {
        router.push("/preprocessing")
      }, 500)
    } catch (err) {
      console.error("Error uploading file:", err)
      setError(err instanceof Error ? err.message : "Terjadi kesalahan saat mengunggah file")
    } finally {
      setUploading(false)
    }
  }

  // Fungsi untuk membaca file sebagai base64
  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        try {
          // Ensure we have a valid result
          if (typeof reader.result === "string") {
            resolve(reader.result)
          } else {
            reject(new Error("Failed to read file as base64"))
          }
        } catch (error) {
          reject(error)
        }
      }
      reader.onerror = (error) => reject(error)

      // Use readAsDataURL instead of potentially problematic methods
      reader.readAsDataURL(file)
    })
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Unggah Data Penjualan</CardTitle>
          <CardDescription>Unggah file CSV yang berisi data penjualan Anda untuk dianalisis</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="border-2 border-dashed border-slate-200 rounded-lg p-8 text-center">
            <div className="flex flex-col items-center justify-center space-y-4">
              <FileUp className="h-12 w-12 text-slate-400" />
              <div className="space-y-2">
                <p className="text-sm text-slate-500">Pilih file CSV atau seret dan lepas di sini</p>
                <p className="text-xs text-slate-400">File harus dalam format CSV dengan kolom yang diperlukan</p>
              </div>
              <input type="file" id="file-upload" accept=".csv" onChange={handleFileChange} className="hidden" />
              <Button
                variant="outline"
                onClick={() => document.getElementById("file-upload")?.click()}
                disabled={uploading}
              >
                Pilih File
              </Button>
            </div>
          </div>

          {file && (
            <div className="flex items-center justify-between p-2 bg-slate-50 rounded border">
              <span className="text-sm truncate max-w-[300px]">{file.name}</span>
              <span className="text-xs text-slate-500">{(file.size / 1024).toFixed(2)} KB</span>
            </div>
          )}

          {uploading && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-xs text-center text-slate-500">Mengunggah dan memvalidasi file...</p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => router.push("/")}>
            Kembali
          </Button>
          <Button onClick={handleUpload} disabled={!file || uploading}>
            <Upload className="mr-2 h-4 w-4" />
            Unggah File
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
