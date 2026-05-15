// ===================================================
// SheetJS(xlsx)를 이용한 엑셀 가져오기/내보내기 함수
// ===================================================

import * as XLSX from 'xlsx';
import { Expense, Category, Person, PaymentMethod, Purpose } from './types';
import { getPurposeBgColor, generateId } from './utils';

// 엑셀 컬럼 헤더 (한국어)
const HEADERS = ['사용목적', '날짜', '지출한사람', '내역', '구매처', '금액', '카테고리', '지출방법', '기타'];

// ── 엑셀 내보내기 ──────────────────────────────────────────────────

export function exportToExcel(
  expenses: Expense[],
  categories: Category[],
  persons: Person[],
  options: {
    mode: 'current' | 'all' | 'filtered';
    year?: number;
    month?: number;
    label?: string;
  }
): void {
  const wb = XLSX.utils.book_new();

  if (options.mode === 'current' || options.mode === 'filtered') {
    // 단일 시트: 현재 월 또는 필터 결과
    const sheetName = options.label ?? '가계부';
    const ws = buildExpenseSheet(expenses);
    XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  } else {
    // 전체: 월별로 시트 분리
    const monthMap = new Map<string, Expense[]>();
    for (const e of expenses) {
      const key = `${e.year}년 ${e.month}월`;
      if (!monthMap.has(key)) monthMap.set(key, []);
      monthMap.get(key)!.push(e);
    }
    // 월 오름차순 정렬
    const sorted = Array.from(monthMap.entries()).sort(([a], [b]) => a.localeCompare(b));
    for (const [label, rows] of sorted) {
      const ws = buildExpenseSheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, label.slice(0, 31));
    }
  }

  // 카테고리 설정 시트
  const catData = [
    ['사용목적', '카테고리명', '분류기준 설명'],
    ...categories.map((c) => [c.purpose, c.name, c.description]),
  ];
  const catWs = XLSX.utils.aoa_to_sheet(catData);
  styleHeaderRow(catWs, catData[0].length);
  XLSX.utils.book_append_sheet(wb, catWs, '카테고리_설정');

  // 사람 설정 시트
  const personData = [['이름'], ...persons.map((p) => [p.name])];
  const personWs = XLSX.utils.aoa_to_sheet(personData);
  styleHeaderRow(personWs, 1);
  XLSX.utils.book_append_sheet(wb, personWs, '사람_설정');

  // 파일 다운로드
  const fileName = options.label
    ? `가계부_${options.label}.xlsx`
    : `가계부_전체_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/** 지출 목록을 워크시트로 변환 */
function buildExpenseSheet(expenses: Expense[]): XLSX.WorkSheet {
  const rows = expenses.map((e) => [
    e.purpose,
    e.date,
    e.person,
    e.item,
    e.place,
    e.amount,
    e.category,
    e.paymentMethod,
    e.memo,
  ]);

  const data = [HEADERS, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(data);

  // 헤더 행 굵게
  styleHeaderRow(ws, HEADERS.length);

  // 사용목적별 행 배경색
  for (let i = 0; i < expenses.length; i++) {
    const e = expenses[i];
    const rowIdx = i + 1; // 헤더가 0번 행
    const color = getPurposeBgColor(e.purpose);
    for (let col = 0; col < HEADERS.length; col++) {
      const cellRef = XLSX.utils.encode_cell({ r: rowIdx, c: col });
      if (!ws[cellRef]) ws[cellRef] = { v: '', t: 's' };
      ws[cellRef].s = { fill: { fgColor: { rgb: color } } };
    }
  }

  // 컬럼 너비 자동 조정
  ws['!cols'] = [
    { wch: 8 },  // 사용목적
    { wch: 10 }, // 날짜
    { wch: 10 }, // 지출한사람
    { wch: 20 }, // 내역
    { wch: 15 }, // 구매처
    { wch: 12 }, // 금액
    { wch: 12 }, // 카테고리
    { wch: 10 }, // 지출방법
    { wch: 25 }, // 기타
  ];

  return ws;
}

/** 헤더 행에 굵은 스타일 적용 */
function styleHeaderRow(ws: XLSX.WorkSheet, colCount: number): void {
  for (let col = 0; col < colCount; col++) {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c: col });
    if (!ws[cellRef]) ws[cellRef] = { v: '', t: 's' };
    ws[cellRef].s = { font: { bold: true }, fill: { fgColor: { rgb: 'F3F4F6' } } };
  }
}

// ── 엑셀 가져오기 ──────────────────────────────────────────────────

export interface ImportResult {
  expenses: Expense[];
  categories: Category[];
  persons: Person[];
  warnings: string[];
}

export function importFromExcel(file: ArrayBuffer): ImportResult {
  const wb = XLSX.read(file, { type: 'array' });
  const warnings: string[] = [];

  // 카테고리 설정 시트 파싱
  const categories: Category[] = [];
  const catSheet = wb.Sheets['카테고리_설정'];
  if (catSheet) {
    const rows = XLSX.utils.sheet_to_json<Record<string, string>>(catSheet, { defval: '' });
    for (const row of rows) {
      const purpose = (row['사용목적'] || '').trim() as Purpose;
      const name = (row['카테고리명'] || '').trim();
      const description = (row['분류기준 설명'] || '').trim();
      if (name && ['생활용', '사업용', '개인용'].includes(purpose)) {
        categories.push({ id: generateId(), purpose, name, description });
      }
    }
  }

  // 사람 설정 시트 파싱
  const persons: Person[] = [];
  const personSheet = wb.Sheets['사람_설정'];
  if (personSheet) {
    const rows = XLSX.utils.sheet_to_json<Record<string, string>>(personSheet, { defval: '' });
    for (const row of rows) {
      const name = (row['이름'] || '').trim();
      if (name) persons.push({ id: generateId(), name });
    }
  }

  // 지출 데이터 시트 파싱 (카테고리/사람 설정 시트 제외)
  const expenses: Expense[] = [];
  const skipSheets = new Set(['카테고리_설정', '사람_설정']);

  for (const sheetName of wb.SheetNames) {
    if (skipSheets.has(sheetName)) continue;

    // 시트명에서 연도 추출 (예: "2026년 5월" → 2026)
    const yearMatch = sheetName.match(/(\d{4})년/);
    const sheetYear = yearMatch ? parseInt(yearMatch[1], 10) : new Date().getFullYear();

    const sheet = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, string | number>>(sheet, { defval: '' });

    for (const row of rows) {
      // 컬럼명 유연하게 매칭
      const purpose = String(row['사용목적'] || row['purpose'] || '').trim() as Purpose;
      const date = String(row['날짜'] || row['date'] || '').trim();
      const person = String(row['지출한사람'] || row['person'] || '').trim();
      const item = String(row['내역'] || row['item'] || '').trim();
      const place = String(row['구매처'] || row['place'] || '').trim();
      const amountRaw = row['금액'] || row['amount'] || 0;
      const amount = typeof amountRaw === 'number' ? amountRaw : parseInt(String(amountRaw).replace(/[^0-9]/g, '') || '0', 10);
      const category = String(row['카테고리'] || row['category'] || '').trim();
      const paymentMethod = String(row['지출방법'] || row['paymentMethod'] || '기타').trim() as PaymentMethod;
      const memo = String(row['기타'] || row['memo'] || '').trim();

      // 필수값 검사
      if (!item && !amount) continue;
      if (!['생활용', '사업용', '개인용'].includes(purpose)) {
        warnings.push(`"${sheetName}" 시트의 행을 건너뜀: 사용목적이 올바르지 않아요 (${purpose})`);
        continue;
      }

      // 날짜 파싱
      const dateMatch = date.match(/(\d{1,2})월\s*(\d{1,2})일/);
      const monthNum = dateMatch ? parseInt(dateMatch[1], 10) : new Date().getMonth() + 1;
      const dayNum = dateMatch ? parseInt(dateMatch[2], 10) : new Date().getDate();

      expenses.push({
        id: generateId(),
        purpose,
        date: date || `${monthNum}월 ${String(dayNum).padStart(2, '0')}일`,
        year: sheetYear,
        month: monthNum,
        day: dayNum,
        person,
        item,
        place,
        amount,
        category,
        paymentMethod: ['현금', '체크카드', '신용카드', '계좌이체', '기타'].includes(paymentMethod)
          ? paymentMethod
          : '기타',
        memo,
        createdAt: new Date().toISOString(),
      });
    }
  }

  return { expenses, categories, persons, warnings };
}
