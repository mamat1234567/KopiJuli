export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-4">
      <div className="flex flex-col items-center justify-center p-8 space-y-4 bg-white rounded-lg shadow-md">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-emerald-500"></div>
        <h3 className="text-xl font-medium text-slate-700">Memproses Data</h3>
        <p className="text-sm text-slate-500">Mohon tunggu sebentar, kami sedang menganalisis data Anda...</p>
      </div>
    </div>
  )
}
