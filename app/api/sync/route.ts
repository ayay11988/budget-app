// ===================================================
// 클라우드 동기화 API (Vercel KV)
// GET  /api/sync  → 저장된 데이터 불러오기
// POST /api/sync  → 데이터 저장
// ===================================================

import { NextRequest, NextResponse } from 'next/server';

const DATA_KEY = 'budget-data';

function getKv() {
  // KV 환경변수 없으면 null 반환
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) return null;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { kv } = require('@vercel/kv');
  return kv;
}

export async function GET() {
  const kv = getKv();
  if (!kv) {
    return NextResponse.json({ data: null, noKv: true, error: 'Vercel KV가 설정되지 않았어요' }, { status: 503 });
  }
  try {
    const data = await kv.get(DATA_KEY);
    return NextResponse.json({ data: data ?? null });
  } catch (err) {
    console.error('[sync GET]', err);
    return NextResponse.json({ data: null, error: 'KV 읽기 실패' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const kv = getKv();
  if (!kv) {
    return NextResponse.json({ ok: false, noKv: true }, { status: 503 });
  }
  try {
    const body = await req.json();
    await kv.set(DATA_KEY, body);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[sync POST]', err);
    return NextResponse.json({ ok: false, error: 'KV 저장 실패' }, { status: 500 });
  }
}
