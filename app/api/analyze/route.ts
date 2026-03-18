import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

    // Lance le pipeline en background pour ce user_id uniquement
    execAsync(
      `python scripts/04_ai_summary.py && python scripts/05_top_feed.py && python scripts/06_upload_supabase.py`,
      {
        env: {
          ...process.env,
          OPENAI_API_KEY: process.env.OPENAI_API_KEY,
          SUPABASE_URL: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
          SUPABASE_KEY: process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          TARGET_USER_ID: userId,
        }
      }
    ).catch(err => console.error('Pipeline error:', err))

    return NextResponse.json({ status: 'analyzing', message: 'Analyse en cours' })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
