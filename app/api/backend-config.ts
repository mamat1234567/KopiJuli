// Konfigurasi URL API untuk App Router API routes
export const API_BASE_URL = ""

// Fungsi helper untuk panggilan API
export async function fetchFromBackend(endpoint: string, options: RequestInit = {}) {
  try {
    console.log(`Fetching from ${endpoint}`)

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    })

    if (!response.ok) {
      const text = await response.text()
      console.error("API response error:", text)
      throw new Error(`API error: ${response.status} ${response.statusText}`)
    }

    const contentType = response.headers.get("content-type")
    if (contentType && contentType.includes("application/json")) {
      return await response.json()
    } else {
      const text = await response.text()
      console.error("Unexpected response format:", text)
      throw new Error("API returned non-JSON response")
    }
  } catch (error) {
    console.error("Error fetching from backend:", error)
    throw error
  }
}
