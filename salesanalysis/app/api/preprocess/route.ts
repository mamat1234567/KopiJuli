import { type NextRequest, NextResponse } from "next/server"
import { parse } from "csv-parse/sync"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { csvContent } = body

    if (!csvContent) {
      return NextResponse.json({ success: false, error: "No CSV content provided" }, { status: 400 })
    }

    // Parse CSV
    let records
    try {
      records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
      })
    } catch (e) {
      return NextResponse.json(
        { success: false, error: `Error parsing CSV: ${e instanceof Error ? e.message : String(e)}` },
        { status: 400 },
      )
    }

    if (records.length === 0) {
      return NextResponse.json({ success: false, error: "CSV file is empty" }, { status: 400 })
    }

    // Validate CSV columns
    const firstRecord = records[0]
    const headers = Object.keys(firstRecord)

    // Find invoice column
    const invoiceCol = headers.find((col) => col.toLowerCase().includes("invoice"))
    if (!invoiceCol) {
      return NextResponse.json({ success: false, error: "No invoice column found" }, { status: 400 })
    }

    // Find product ID column
    const productIdCol = headers.find(
      (col) => col.toLowerCase().includes("id produk") || col.toLowerCase().includes("product id"),
    )
    if (!productIdCol) {
      return NextResponse.json({ success: false, error: "No product ID column found" }, { status: 400 })
    }

    // Find product name column
    const productNameCol = headers.find(
      (col) => col.toLowerCase().includes("detail menu") || col.toLowerCase().includes("product name"),
    )
    if (!productNameCol) {
      return NextResponse.json({ success: false, error: "No product name column found" }, { status: 400 })
    }

    // Clean data - remove rows with missing values in required columns
    const cleanRecords = records.filter(
      (record) => record[invoiceCol] && record[productIdCol] && record[productNameCol],
    )

    // Create product map
    const productMap: Record<string, string> = {}
    cleanRecords.forEach((record) => {
      productMap[String(record[productIdCol])] = String(record[productNameCol])
    })

    // Group by invoice to create transactions
    const invoiceGroups: Record<string, Array<{ id: string; name: string }>> = {}
    cleanRecords.forEach((record) => {
      const invoice = String(record[invoiceCol])
      if (!invoiceGroups[invoice]) {
        invoiceGroups[invoice] = []
      }

      // Avoid duplicates
      const productId = String(record[productIdCol])
      if (!invoiceGroups[invoice].some((item) => item.id === productId)) {
        invoiceGroups[invoice].push({
          id: productId,
          name: String(record[productNameCol]),
        })
      }
    })

    // Convert to transactions array
    const transactions = Object.keys(invoiceGroups).map((invoice) => ({
      invoiceNo: invoice,
      items: invoiceGroups[invoice],
    }))

    // Calculate statistics
    const stats = {
      totalTransactions: transactions.length,
      totalProducts: Object.keys(productMap).length,
      totalItems: cleanRecords.length,
    }

    // Get sample of raw data for preview
    const rawDataPreview = records.slice(0, 10)

    // Get sample of processed transactions for preview
    const processedPreview = transactions.slice(0, 10)

    return NextResponse.json({
      success: true,
      stats: stats,
      raw_data_preview: rawDataPreview,
      processed_preview: processedPreview,
      transactions: transactions,
      product_map: productMap,
    })
  } catch (error) {
    console.error("Error in preprocess handler:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred" },
      { status: 500 },
    )
  }
}
