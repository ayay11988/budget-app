// ===================================================
// 클라우드 동기화 API (Vercel Blob)
// GET  /api/sync  → 저장된 데이터 불러오기
// POST /api/sync  → 데이터 저장
// ===================================================

import { NextRequest, NextResponse } from 'next/server';
import { put, list } from '@vercel/blob';

const BLOB_PATH = 'budget-data.json';

export async function GET() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { data: null, noKv: true, error: 'Vercel Blob이 설정되지 않았어요' },
      { status: 503 }
    );
  }
  try {
    const { blobs } = await list({
      prefix: BLOB_PATH,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    if (blobs.length === 0) {
      return NextResponse.json({ data: null }); // 저장된 데이터 없음
    }

    // Private store: Authorization 헤더로 직접 fetch
    const res = await fetch(blobs[0].url, {
      cache: 'no-store',
      headers: {
        Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`,
      },
    });
    if (!res.ok) return NextResponse.json({ data: null });

    const data = await res.json();
    return NextResponse.json({ data });
  } catch (err) {
    console.error('[sync GET]', err);
    return NextResponse.json({ data: null, error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ ok: false, noKv: true }, { status: 503 });
  }
  try {
    const body = await req.json();
    // Private store: access: 'public' 제거, allowOverwrite로 덮어쓰기
    await put(BLOB_PATH, JSON.stringify(body), {
      allowOverwrite: true,
      addRandomSuffix: false,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[sync POST]', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
