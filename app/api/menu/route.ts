import { NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'public', 'DataMenu.csv')
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'File DataMenu.csv tidak ditemukan' }, { status: 404 })
    }

    // Read CSV file
    const fileContent = fs.readFileSync(filePath, 'utf-8')
    const lines = fileContent.trim().split('\n')
    
    // Parse CSV (skip header)
    const menuItems = []
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (line) {
        const [menu, harga] = line.split(',')
        menuItems.push({
          menu: menu.trim(),
          harga: parseInt(harga.trim())
        })
      }
    }

    return NextResponse.json({ 
      success: true, 
      data: menuItems,
      message: `Berhasil membaca ${menuItems.length} item menu`
    })
  } catch (error) {
    console.error('Error reading CSV file:', error)
    return NextResponse.json({ 
      error: 'Gagal membaca file CSV',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
