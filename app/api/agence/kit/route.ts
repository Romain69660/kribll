import { NextRequest, NextResponse } from 'next/server'
import { codeOk } from '../../../../lib/agence/code'
import { KIT } from '../../../../lib/agence/kit'

// Le kit n'est jamais embarqué dans les pages : il n'est servi qu'avec le code de l'agence.
export async function GET(req: NextRequest) {
  if (process.env.NEXT_PUBLIC_GBADW_DEMO !== '1' && !codeOk(req.headers.get('x-agence-code')))
    return NextResponse.json({ error: "Code de l'agence incorrect, reconnectez-vous" }, { status: 401 })
  return NextResponse.json(KIT, { headers: { 'Cache-Control': 'no-store' } })
}
