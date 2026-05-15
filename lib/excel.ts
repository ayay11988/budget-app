// ===================================================
// SheetJS(xlsx)를 이용한 엑셀 가져오기/내보내기 함수
// ===================================================

import * as XLSX from 'xlsx';
import { Expense, Category, Person, PaymentMethod, Purpose } from './types';
import { getPurposeBgColor, generateId } from './utils';

// 엑셀 컬럼 헤더 (한국어)
const HEADERS = ['사용목적', '날짜', '지출한사람', '내역', '구매처', '금액', '카테고리', '지출방법', '기타'];

// ── 날짜 파싱 헬퍼 ────────────────────────────────────────────────────────────
/**
 * 엑셀에서 날짜가 숫자(일련번호)로 넘어오는 경우를 처리
 * 예: 46153 → "04월 22일"  /  "04월 22일" → 그대로
 */
function parseExcelDate(value: unknown): { dateStr: string; month: number; day: number } | null {
  // ① 엑셀 날짜 일련번호 (숫자): 30000~60000 범위 = 대략 1982~2064년
  if (typeof value === 'number' && value > 30000 && value < 70000) {
    // 엑셀 epoch(1900-01-00)을 Unix epoch(1970-01-01)로 변환
    const date = new Date(Math.round((value - 25569) * 86400 * 1000));
    const month = date.getUTCMonth() + 1;
    const day = date.getUTCDate();
    return {
      dateStr: `${String(month).padStart(2, '0')}월 ${String(day).padStart(2, '0')}일`,
      month,
      day,
    };
  }

  // ② "MM월 DD일" 형식 문자열
  const str = String(value ?? '').trim();
  const koMatch = str.match(/(\d{1,2})월\s*(\d{1,2})일/);
  if (koMatch) {
    return {
      dateStr: str,
      month: parseInt(koMatch[1], 10),
      day: parseInt(koMatch[2], 10),
    };
  }

  // ③ "YYYY-MM-DD" 또는 "MM/DD/YYYY" 형식
  const isoMatch = str.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const m = parseInt(isoMatch[2], 10);
    const d = parseInt(isoMatch[3], 10);
    return {
      dateStr: `${String(m).padStart(2, '0')}월 ${String(d).padStart(2, '0')}일`,
      month: m,
      day: d,
    };
  }
  const slashMatch = str.match(/(\d{1,2})\/(\d{1,2})/);
  if (slashMatch) {
    const m = parseInt(slashMatch[1], 10);
    const d = parseInt(slashMatch[2], 10);
    return {
      dateStr: `${String(m).padStart(2, '0')}월 ${String(d).padStart(2, '0')}일`,
      month: m,
      day: d,
    };
  }

  // ④ JavaScript Date 객체 (cellDates 옵션 사용 시)
  if (value instanceof Date) {
    const m = value.getMonth() + 1;
    const d = value.getDate();
    return {
      dateStr: `${String(m).padStart(2, '0')}월 ${String(d).padStart(2, '0')}일`,
      month: m,
      day: d,
    };
  }

  return null;
}

// ── 금액 파싱 헬퍼 ────────────────────────────────────────────────────────────
/**
 * 다양한 형식의 금액을 숫자로 변환
 * "13,500" / "₩13,500" / "13500원" / 13500 → 모두 13500
 */
function parseExcelAmount(value: unknown): number {
  if (typeof value === 'number') return Math.round(value); // 이미 숫자
  const str = String(value ?? '').replace(/[₩,원\s]/g, '').trim();
  const num = parseInt(str, 10);
  return isNaN(num) ? 0 : num;
}

// ── 컬럼명 유연 매칭 헬퍼 ────────────────────────────────────────────────────
/** 가능한 컬럼명 후보들 중 첫 번째로 값이 있는 것을 반환 */
function getCol(row: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    // 정확히 일치
    if (row[key] !== undefined && row[key] !== '') return row[key];
    // 앞뒤 공백 제거 후 일치
    const found = Object.keys(row).find(
      (k) => k.trim().replace(/\s/g, '') === key.replace(/\s/g, '')
    );
    if (found && row[found] !== undefined && row[found] !== '') return row[found];
  }
  return '';
}

// ── 엑셀 내보내기 ──────────────────────────────────────────────────────────────

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
    const sheetName = options.label ?? '가계부';
    const ws = buildExpenseSheet(expenses);
    XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  } else {
    const monthMap = new Map<string, Expense[]>();
    for (const e of expenses) {
      const key = `${e.year}년 ${e.month}월`;
      if (!monthMap.has(key)) monthMap.set(key, []);
      monthMap.get(key)!.push(e);
    }
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
  XLSX.utils.book_append_sheet(wb, catWs, '카테고리_설정');

  // 사람 설정 시트
  const personData = [['이름'], ...persons.map((p) => [p.name])];
  const personWs = XLSX.utils.aoa_to_sheet(personData);
  XLSX.utils.book_append_sheet(wb, personWs, '사람_설정');

  const fileName = options.label
    ? `가계부_${options.label}.xlsx`
    : `가계부_전체_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/** 지출 목록을 워크시트로 변환 */
function buildExpenseSheet(expenses: Expense[]): XLSX.WorkSheet {
  const rows = expenses.map((e) => [
    e.purpose, e.date, e.person, e.item, e.place,
    e.amount, e.category, e.paymentMethod, e.memo,
  ]);
  const data = [HEADERS, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(data);

  // 헤더 행 굵게
  for (let col = 0; col < HEADERS.length; col++) {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c: col });
    if (!ws[cellRef]) ws[cellRef] = { v: '', t: 's' };
    ws[cellRef].s = { font: { bold: true }, fill: { fgColor: { rgb: 'F3F4F6' } } };
  }

  // 사용목적별 행 배경색
  for (let i = 0; i < expenses.length; i++) {
    const color = getPurposeBgColor(expenses[i].purpose);
    for (let col = 0; col < HEADERS.length; col++) {
      const cellRef = XLSX.utils.encode_cell({ r: i + 1, c: col });
      if (!ws[cellRef]) ws[cellRef] = { v: '', t: 's' };
      ws[cellRef].s = { fill: { fgColor: { rgb: color } } };
    }
  }

  ws['!cols'] = [
    { wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 20 }, { wch: 15 },
    { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 25 },
  ];
  return ws;
}

// ── 엑셀 가져오기 ──────────────────────────────────────────────────────────────

export interface ImportResult {
  expenses: Expense[];
  categories: Category[];
  persons: Person[];
  warnings: string[];
}

export function importFromExcel(file: ArrayBuffer): ImportResult {
  // cellDates: true → 날짜 셀을 JS Date 객체로 읽어옴
  const wb = XLSX.read(file, { type: 'array', cellDates: true });
  const warnings: string[] = [];

  // 카테고리 설정 시트
  const categories: Category[] = [];
  const catSheet = wb.Sheets['카테고리_설정'];
  if (catSheet) {
    const rows = XLSX.utils.sheet_to_json<Record<string, string>>(catSheet, { defval: '' });
    for (const row of rows) {
      const purpose = (row['사용목적'] ?? '').trim() as Purpose;
      const name = (row['카테고리명'] ?? '').trim();
      const description = (row['분류기준 설명'] ?? '').trim();
      if (name && ['생활용', '사업용', '개인용'].includes(purpose)) {
        categories.push({ id: generateId(), purpose, name, description });
      }
    }
  }

  // 사람 설정 시트
  const persons: Person[] = [];
  const personSheet = wb.Sheets['사람_설정'];
  if (personSheet) {
    const rows = XLSX.utils.sheet_to_json<Record<string, string>>(personSheet, { defval: '' });
    for (const row of rows) {
      const name = (row['이름'] ?? '').trim();
      if (name) persons.push({ id: generateId(), name });
    }
  }

  // 지출 데이터 시트 파싱
  const expenses: Expense[] = [];
  const skipSheets = new Set(['카테고리_설정', '사람_설정']);

  for (const sheetName of wb.SheetNames) {
    if (skipSheets.has(sheetName)) continue;

    // 시트명에서 연도 추출 ("2026년 5월" → 2026), 없으면 현재 연도
    const yearMatch = sheetName.match(/(\d{4})년?/);
    const sheetYear = yearMatch ? parseInt(yearMatch[1], 10) : new Date().getFullYear();

    const sheet = wb.Sheets[sheetName];
    // raw: false → 서식 적용된 값,  defval: '' → 빈 셀은 ''
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: '',
      raw: false, // 날짜를 문자열로 받아서 직접 파싱
    });

    // raw: false 로 못 잡히는 날짜 일련번호를 위해 raw 버전도 병행
    const rowsRaw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: '',
      raw: true,
    });

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowRaw = rowsRaw[i];

      // ── 컬럼 유연 매칭 ──────────────────────────────
      const purposeRaw = String(
        getCol(row, '사용목적', 'purpose', '분류') || '생활용'
      ).trim();
      const purpose: Purpose = ['생활용', '사업용', '개인용'].includes(purposeRaw)
        ? (purposeRaw as Purpose)
        : '생활용';

      // 날짜: raw 버전에서 먼저 파싱 (일련번호 처리)
      const dateRawVal = getCol(rowRaw, '날짜', 'date', '일자', '거래일', '결제일') || '';
      const dateStrVal = getCol(row, '날짜', 'date', '일자', '거래일', '결제일') || '';
      const parsedDate =
        parseExcelDate(dateRawVal) ??
        parseExcelDate(dateStrVal) ??
        parseExcelDate(new Date());

      const month = parsedDate?.month ?? (new Date().getMonth() + 1);
      const day = parsedDate?.day ?? new Date().getDate();
      const dateStr = parsedDate?.dateStr ??
        `${String(month).padStart(2, '0')}월 ${String(day).padStart(2, '0')}일`;

      // 금액: raw 숫자 우선, 없으면 서식 문자열에서 파싱
      const amountRawVal = getCol(rowRaw, '금액', 'amount', '가격', '결제금액', '지출금액');
      const amountStrVal = getCol(row, '금액', 'amount', '가격', '결제금액', '지출금액');
      const amount =
        typeof amountRawVal === 'number' && amountRawVal > 0
          ? Math.round(amountRawVal)
          : parseExcelAmount(amountStrVal || amountRawVal);

      const item = String(
        getCol(row, '내역', 'item', '항목', '상품명', '품목', '지출내역') || ''
      ).trim();
      const place = String(
        getCol(row, '구매처', 'place', '상호', '가맹점', '거래처') || ''
      ).trim();
      const category = String(
        getCol(row, '카테고리', '종류', 'category', '분류') || ''
      ).trim();
      const paymentRaw = String(
        getCol(row, '지출방법', '지불방법', '결제방법', 'paymentMethod') || '기타'
      ).trim();
      const person = String(
        getCol(row, '지출한사람', '지출한 사람', 'person', '이름', '사용자') || ''
      ).trim();
      const memo = String(
        getCol(row, '기타', '메모', 'memo', '비고', '할부?', '할부') || ''
      ).trim();

      // 내역 또는 금액 중 하나라도 있어야 유효한 행
      if (!item && amount === 0) continue;

      const validMethods: PaymentMethod[] = ['현금', '체크카드', '신용카드', '계좌이체', '기타'];
      const paymentMethod: PaymentMethod = validMethods.includes(paymentRaw as PaymentMethod)
        ? (paymentRaw as PaymentMethod)
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
    }

    if (expenses.length === 0 && rows.length > 0) {
      warnings.push(`"${sheetName}" 시트에서 유효한 데이터를 찾지 못했어요`);
    }
  }

  return { expenses, categories, persons, warnings };
}
