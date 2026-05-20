// ===================================================
// 클라우드 동기화 API (Vercel KV)
// GET  /api/sync  → 저장된 데이터 불러오기
// POST /api/sync  → 데이터 저장
// ===================================================

import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

const DATA_KEY = 'budget-data';

export async function GET() {
  try {
    const data = await kv.get(DATA_KEY);
    return NextResponse.json({ data: data ?? null });
  } catch (err) {
    console.error('[sync GET]', err);
    return NextResponse.json({ data: null, error: 'KV 읽기 실패' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    await kv.set(DATA_KEY, body);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[sync POST]', err);
    return NextResponse.json({ ok: false, error: 'KV 저장 실패' }, { status: 500 });
  }
}
