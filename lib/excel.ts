// ===================================================
// SheetJS(xlsx) 엑셀 가져오기/내보내기
// ===================================================

import * as XLSX from 'xlsx';
import { Expense, Category, Person, PaymentMethod, Purpose } from './types';
import { getPurposeBgColor, generateId } from './utils';

const HEADERS = ['사용목적', '날짜', '지출한사람', '내역', '구매처', '금액', '카테고리', '지출방법', '기타'];

// ── 날짜 파싱 ─────────────────────────────────────────────────────────────────
function parseExcelDate(value: unknown): { dateStr: string; month: number; day: number } | null {
  if (value === null || value === undefined || value === '') return null;

  // ① JS Date 객체 (cellDates:true 옵션 시)
  if (value instanceof Date && !isNaN(value.getTime())) {
    const m = value.getUTCMonth() + 1; // UTC 기준 (timezone 오차 방지)
    const d = value.getUTCDate();
    return { dateStr: `${String(m).padStart(2, '0')}월 ${String(d).padStart(2, '0')}일`, month: m, day: d };
  }

  // ② 엑셀 날짜 일련번호 (숫자, 대략 2000년~2040년 범위)
  if (typeof value === 'number' && value > 36526 && value < 73050) {
    // 엑셀 epoch → Unix epoch: 엑셀은 1900-01-00 기준, Unix는 1970-01-01 기준
    // 25569 = days(1900-01-01 to 1970-01-01) + 엑셀 1900 윤년 버그 보정
    const ms = Math.round((value - 25569) * 86400 * 1000);
    const date = new Date(ms);
    const m = date.getUTCMonth() + 1;
    const d = date.getUTCDate();
    return { dateStr: `${String(m).padStart(2, '0')}월 ${String(d).padStart(2, '0')}일`, month: m, day: d };
  }

  const str = String(value).trim();

  // ③ "MM월 DD일" 또는 "M월 D일"
  const koMatch = str.match(/(\d{1,2})월\s*(\d{1,2})일/);
  if (koMatch) {
    const m = parseInt(koMatch[1], 10);
    const d = parseInt(koMatch[2], 10);
    return { dateStr: `${String(m).padStart(2, '0')}월 ${String(d).padStart(2, '0')}일`, month: m, day: d };
  }

  // ④ "YYYY-MM-DD"
  const isoMatch = str.match(/\d{4}-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const m = parseInt(isoMatch[1], 10);
    const d = parseInt(isoMatch[2], 10);
    return { dateStr: `${String(m).padStart(2, '0')}월 ${String(d).padStart(2, '0')}일`, month: m, day: d };
  }

  // ⑤ "MM/DD" 또는 "M/D"
  const slashMatch = str.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (slashMatch) {
    const m = parseInt(slashMatch[1], 10);
    const d = parseInt(slashMatch[2], 10);
    return { dateStr: `${String(m).padStart(2, '0')}월 ${String(d).padStart(2, '0')}일`, month: m, day: d };
  }

  return null;
}

// ── 금액 파싱 ─────────────────────────────────────────────────────────────────
function parseExcelAmount(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return Math.abs(Math.round(value)); // 숫자 그대로
  // 문자열: ₩, 원, 콤마, 공백 제거 후 파싱
  const str = String(value).replace(/[₩,원\s]/g, '').trim();
  const n = parseFloat(str);
  return isNaN(n) ? 0 : Math.abs(Math.round(n));
}

// ── 컬럼명 유연 매칭 ──────────────────────────────────────────────────────────
function getCol(row: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    // 정확히 일치
    if (row[key] !== undefined && row[key] !== null && row[key] !== '') return row[key];
    // 공백 제거 후 일치
    const normalKey = key.replace(/\s/g, '');
    const found = Object.keys(row).find(
      (k) => k.trim().replace(/\s/g, '') === normalKey
    );
    if (found !== undefined && row[found] !== undefined && row[found] !== null && row[found] !== '') {
      return row[found];
    }
  }
  return undefined;
}

// ── 엑셀 내보내기 ─────────────────────────────────────────────────────────────

export function exportToExcel(
  expenses: Expense[],
  categories: Category[],
  persons: Person[],
  options: { mode: 'current' | 'all' | 'filtered'; year?: number; month?: number; label?: string }
): void {
  const wb = XLSX.utils.book_new();

  if (options.mode === 'current' || options.mode === 'filtered') {
    XLSX.utils.book_append_sheet(wb, buildExpenseSheet(expenses), (options.label ?? '가계부').slice(0, 31));
  } else {
    const monthMap = new Map<string, Expense[]>();
    for (const e of expenses) {
      const key = `${e.year}년 ${e.month}월`;
      if (!monthMap.has(key)) monthMap.set(key, []);
      monthMap.get(key)!.push(e);
    }
    for (const [label, rows] of Array.from(monthMap.entries()).sort(([a], [b]) => a.localeCompare(b))) {
      XLSX.utils.book_append_sheet(wb, buildExpenseSheet(rows), label.slice(0, 31));
    }
  }

  // 카테고리 설정 시트
  const catWs = XLSX.utils.aoa_to_sheet([
    ['사용목적', '카테고리명', '분류기준 설명'],
    ...categories.map((c) => [c.purpose, c.name, c.description]),
  ]);
  XLSX.utils.book_append_sheet(wb, catWs, '카테고리_설정');

  // 사람 설정 시트
  const personWs = XLSX.utils.aoa_to_sheet([['이름'], ...persons.map((p) => [p.name])]);
  XLSX.utils.book_append_sheet(wb, personWs, '사람_설정');

  XLSX.writeFile(wb, options.label
    ? `가계부_${options.label}.xlsx`
    : `가계부_전체_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

function buildExpenseSheet(expenses: Expense[]): XLSX.WorkSheet {
  const data = [
    HEADERS,
    ...expenses.map((e) => [e.purpose, e.date, e.person, e.item, e.place, e.amount, e.category, e.paymentMethod, e.memo]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(data);
  for (let col = 0; col < HEADERS.length; col++) {
    const ref = XLSX.utils.encode_cell({ r: 0, c: col });
    if (!ws[ref]) ws[ref] = { v: '', t: 's' };
    ws[ref].s = { font: { bold: true }, fill: { fgColor: { rgb: 'F3F4F6' } } };
  }
  for (let i = 0; i < expenses.length; i++) {
    const color = getPurposeBgColor(expenses[i].purpose);
    for (let col = 0; col < HEADERS.length; col++) {
      const ref = XLSX.utils.encode_cell({ r: i + 1, c: col });
      if (!ws[ref]) ws[ref] = { v: '', t: 's' };
      ws[ref].s = { fill: { fgColor: { rgb: color } } };
    }
  }
  ws['!cols'] = [8, 10, 10, 20, 15, 12, 12, 10, 25].map((wch) => ({ wch }));
  return ws;
}

// ── 엑셀 가져오기 ─────────────────────────────────────────────────────────────

export interface ImportResult {
  expenses: Expense[];
  categories: Category[];
  persons: Person[];
  warnings: string[];
}

export function importFromExcel(file: ArrayBuffer): ImportResult {
  // cellDates:true → 날짜 셀을 JS Date 객체로 변환
  // raw:true       → 숫자 셀을 있는 그대로 (문자열 변환 없이)
  const wb = XLSX.read(file, { type: 'array', cellDates: true, raw: true });
  const warnings: string[] = [];

  // ── 카테고리 시트 ──────────────────────────────
  const categories: Category[] = [];
  const catSheet = wb.Sheets['카테고리_설정'];
  if (catSheet) {
    for (const row of XLSX.utils.sheet_to_json<Record<string, string>>(catSheet, { defval: '' })) {
      const purpose = row['사용목적']?.trim() as Purpose;
      const name = row['카테고리명']?.trim();
      if (name && ['생활용', '사업용', '개인용'].includes(purpose)) {
        categories.push({ id: generateId(), purpose, name, description: row['분류기준 설명']?.trim() ?? '' });
      }
    }
  }

  // ── 사람 시트 ──────────────────────────────────
  const persons: Person[] = [];
  const personSheet = wb.Sheets['사람_설정'];
  if (personSheet) {
    for (const row of XLSX.utils.sheet_to_json<Record<string, string>>(personSheet, { defval: '' })) {
      const name = row['이름']?.trim();
      if (name) persons.push({ id: generateId(), name });
    }
  }

  // ── 지출 데이터 시트 ───────────────────────────
  const expenses: Expense[] = [];
  const skipSheets = new Set(['카테고리_설정', '사람_설정']);
  const currentYear = new Date().getFullYear();

  for (const sheetName of wb.SheetNames) {
    if (skipSheets.has(sheetName)) continue;

    // 시트명에서 연도 추출 ("2026년 5월" → 2026)
    const yearMatch = sheetName.match(/(\d{4})/);
    const sheetYear = yearMatch ? parseInt(yearMatch[1], 10) : currentYear;

    const sheet = wb.Sheets[sheetName];
    if (!sheet) continue;

    // raw:true로 읽어서 날짜/숫자를 원시값으로 받음
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: '',
      raw: true,
    });

    let added = 0;
    for (const row of rows) {
      // ── 날짜 ──────────────────────────────────
      const dateVal = getCol(row, '날짜', 'date', '일자', '거래일', '결제일', '지출날짜', '지출 날짜');
      const parsedDate = parseExcelDate(dateVal);
      const month = parsedDate?.month ?? (new Date().getMonth() + 1);
      const day = parsedDate?.day ?? new Date().getDate();
      const dateStr = parsedDate?.dateStr
        ?? `${String(new Date().getMonth() + 1).padStart(2, '0')}월 ${String(new Date().getDate()).padStart(2, '0')}일`;

      // ── 금액 ──────────────────────────────────
      const amountVal = getCol(row, '금액', 'amount', '가격', '결제금액', '지출금액', '합계금액');
      const amount = parseExcelAmount(amountVal);

      // ── 필수값 검사 ───────────────────────────
      const item = String(getCol(row, '내역', 'item', '항목', '상품명', '품목', '지출내역') ?? '').trim();
      if (!item && amount === 0) continue; // 완전히 빈 행은 스킵

      // ── 사용목적 ──────────────────────────────
      const purposeRaw = String(getCol(row, '사용목적', 'purpose', '분류') ?? '').trim();
      const purpose: Purpose = ['생활용', '사업용', '개인용'].includes(purposeRaw)
        ? (purposeRaw as Purpose)
        : '생활용';

      // ── 나머지 컬럼 ───────────────────────────
      const place = String(getCol(row, '구매처', 'place', '상호', '가맹점', '거래처', '쇼핑몰') ?? '').trim();
      const category = String(getCol(row, '카테고리', '종류', 'category') ?? '').trim();
      const person = String(getCol(row, '지출한사람', '지출한 사람', 'person', '이름', '사용자', '지출') ?? '').trim();
      const memo = String(getCol(row, '기타', '메모', 'memo', '비고', '할부', '할부?') ?? '').trim();
      const pmRaw = String(getCol(row, '지출방법', '지불방법', '결제방법', 'paymentMethod') ?? '기타').trim();
      const VALID_METHODS: PaymentMethod[] = ['현금', '체크카드', '신용카드', '계좌이체', '기타'];
      const paymentMethod: PaymentMethod = VALID_METHODS.includes(pmRaw as PaymentMethod)
        ? (pmRaw as PaymentMethod)
        : '기타';

      expenses.push({
        id: generateId(),
        purpose,
        date: dateStr,
        year: sheetYear,
        month,
        day,
        person,
        item,
        place,
        amount,
        category,
        paymentMethod,
        memo,
        createdAt: new Date().toISOString(),
      });
      added++;
    }

    if (added === 0 && rows.length > 0) {
      warnings.push(`"${sheetName}" 시트에서 가져올 데이터를 찾지 못했어요`);
    }
  }

  return { expenses, categories, persons, warnings };
}
