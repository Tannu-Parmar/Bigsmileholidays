import { getExcelFileBuffer } from "@/lib/excel"

export const runtime = "nodejs"

export async function GET() {
  try {
    const buf = getExcelFileBuffer()
    return new Response(buf, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="document-records.xlsx"`,
      },
    })
  } catch (err: any) {
    console.error("[v0] export error:", err?.message)
    return new Response("Export failed", { status: 500 })
  }
}
