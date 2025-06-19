"use client"

import { useAuth } from "@/contexts/auth-context"
import LoginForm from "@/components/login-form"
import Header from "@/components/header"

interface AuthWrapperProps {
  children: React.ReactNode
}

export default function AuthWrapper({ children }: AuthWrapperProps) {
  const { isAuthenticated, login } = useAuth()

  if (!isAuthenticated) {
    return <LoginForm onLogin={login} />
  }

  return (
    <>
      <Header />
      <main>{children}</main>
    </>
  )
}
