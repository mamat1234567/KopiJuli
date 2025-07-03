import { type NextRequest, NextResponse } from "next/server"
import crypto from "crypto"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { fileData } = body

    if (!fileData) {
      return NextResponse.json({ success: false, error: "No file data provided" }, { status: 400 })
    }

    // Decode base64 file data
    let csvContent
    try {
      // Handle both with and without data URL prefix
      if (fileData.includes(",")) {
        csvContent = Buffer.from(fileData.split(",")[1], "base64").toString("utf-8")
      } else {
        csvContent = Buffer.from(fileData, "base64").toString("utf-8")
      }
    } catch (e) {
      console.error("Error decoding file data:", e)
      return NextResponse.json(
        { success: false, error: `Error decoding file data: ${e instanceof Error ? e.message : String(e)}` },
        { status: 400 },
      )
    }

    // Validate CSV content
    if (!csvContent || csvContent.trim() === "") {
      return NextResponse.json({ success: false, error: "CSV content is empty" }, { status: 400 })
    }

    // Generate a session ID
    const sessionId = crypto.createHash("md5").update(Date.now().toString()).digest("hex")

    // Count rows and get columns
    const lines = csvContent.split("\n")
    if (lines.length < 2) {
      return NextResponse.json(
        { success: false, error: "CSV file must have at least a header and one data row" },
        { status: 400 },
      )
    }

    const rowCount = lines.length - 1 // Subtract header
    const columns = lines[0].split(",")

    // Return success response
    return NextResponse.json({
      success: true,
      message: "File uploaded successfully",
      session_id: sessionId,
      row_count: rowCount,
      columns: columns,
      csv_content: csvContent,
    })
  } catch (error) {
    console.error("Error in upload handler:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred" },
      { status: 500 },
    )
  }
}
