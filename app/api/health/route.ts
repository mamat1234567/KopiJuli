import { NextResponse } from "next/server"

export function GET() {
  return NextResponse.json({
    status: "healthy",
    message: "Next.js App Router API is running",
    timestamp: new Date().toISOString(),
  })
}
