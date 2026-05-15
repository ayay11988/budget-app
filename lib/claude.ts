// ===================================================
// Claude API 호출 헬퍼 함수
// 실제 API 호출은 Next.js Route Handler(/api/*)에서 수행
// 이 파일은 클라이언트에서 API를 호출하는 fetch 래퍼
// ===================================================

import { CategorizationResult, Category, ReceiptItem } from './types';

// ── 카테고리 자동 분류 ────────────────────────────────
export async function categorizeExpense(params: {
  item: string;
  place: string;
  amount: number;
  purpose?: string;
  categories: Category[];
}): Promise<CategorizationResult> {
  const res = await fetch('/api/categorize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    throw new Error('카테고리 분류에 실패했어요 😢');
  }

  return res.json();
}

// ── 여러 항목 일괄 분류 ──────────────────────────────
export async function categorizeBatch(
  items: { item: string; place: string; amount: number; purpose?: string }[],
  categories: Category[]
): Promise<CategorizationResult[]> {
  // 순서 보장을 위해 순차 처리 (병렬 시 API 레이트 리밋 고려)
  const results: CategorizationResult[] = [];
  for (const it of items) {
    try {
      const result = await categorizeExpense({ ...it, categories });
      results.push(result);
    } catch {
      // 개별 실패 시 기본값으로 채움
      results.push({ category: null, purpose: null, confidence: 0, reason: '분류 실패' });
    }
  }
  return results;
}

// ── 영수증 OCR ────────────────────────────────────────
export async function extractReceipt(file: File): Promise<ReceiptItem[]> {
  // 이미지를 base64로 변환
  const base64 = await fileToBase64(file);
  const mimeType = file.type || 'image/jpeg';

  const res = await fetch('/api/extract-receipt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ base64, mimeType }),
  });

  if (!res.ok) {
    throw new Error('영수증 인식에 실패했어요 😢');
  }

  return res.json();
}

// ── 유틸: File → base64 ──────────────────────────────
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // data:image/jpeg;base64,xxxx 에서 xxxx 부분만 추출
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
