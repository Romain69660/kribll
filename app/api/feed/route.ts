import { exec } from "child_process"
import { promisify } from "util"
import fs from "fs"
import path from "path"

const execAsync = promisify(exec)

export async function GET() {
  try {
    const scriptPath = path.join(process.cwd(), "scripts", "kribll_master.py")

    await execAsync(`python "${scriptPath}"`)

    const dataPath = path.join(process.cwd(), "data", "kribll_results.csv")

    const csv = fs.readFileSync(dataPath, "utf8")

    return new Response(csv, {
      status: 200,
      headers: { "Content-Type": "text/plain" }
    })
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Pipeline failed" }),
      { status: 500 }
    )
  }
}