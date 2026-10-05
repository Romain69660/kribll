import { NextRequest, NextResponse } from 'next/server'
import { codeOk } from '../../../../lib/agence/code'

export async function POST(req: NextRequest) {
  const { code } = await req.json().catch(() => ({ code: '' }))
  return NextResponse.json({ ok: codeOk(code) }, { status: codeOk(code) ? 200 : 401 })
}
