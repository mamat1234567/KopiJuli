"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Coffee, Lock, Mail } from "lucide-react"

// Hardcoded user accounts
const VALID_ACCOUNTS = [
  { email: "admin@gmail.com", password: "admin123", name: "Administrator" },
  { email: "user1@gmail.com", password: "user123", name: "User 1" },
  { email: "user2@gmail.com", password: "user123", name: "User 2" },
  { email: "user3@gmail.com", password: "user123", name: "User 3" },
  { email: "user4@gmail.com", password: "user123", name: "User 4" },
]

interface LoginFormProps {
  onLogin: (user: { email: string; name: string }) => void
}

export default function LoginForm({ onLogin }: LoginFormProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    // Simulate loading delay
    await new Promise(resolve => setTimeout(resolve, 1000))

    const user = VALID_ACCOUNTS.find(
      account => account.email === email && account.password === password
    )

    if (user) {
      onLogin({ email: user.email, name: user.name })
    } else {
      setError("Email atau password tidak valid")
    }

    setIsLoading(false)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-amber-600 p-3 rounded-full mb-4">
            <Coffee className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Kopi Juli</h1>
          <p className="text-slate-600 mt-2">Silakan login untuk melanjutkan</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Login</CardTitle>
            <CardDescription>
              Masukkan email dan password Anda untuk mengakses sistem
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Masukkan email Anda"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Masukkan password Anda"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Sedang login..." : "Login"}
              </Button>
            </form>

           
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
