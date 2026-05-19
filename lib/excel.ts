// ===================================================
// SheetJS(xlsx) 엑셀 가져오기/내보내기
// ===================================================

import * as XLSX from 'xlsx';
import { Expense, Category, Person, PaymentMethod, Purpose } from './types';
import { getPurposeBgColor, generateId } from './utils';

const HEADERS = ['사용목적', '날짜', '지출한사람', '내역', '구매처', '금액', '카테고리', '지출방법', '기타'];

// ── 날짜 파싱 ─────────────────────────────────────────────────────────────────
function makeDate(m: number, d: number) {
  return { dateStr: `${String(m).padStart(2, '0')}월 ${String(d).padStart(2, '0')}일`, month: m, day: d };
}

function parseExcelDate(value: unknown): { dateStr: string; month: number; day: number } | null {
  if (value === null || value === undefined || value === '') return null;

  // ① JS Date 객체 (cellDates:true 옵션 시)
  if (value instanceof Date && !isNaN(value.getTime())) {
    const m = value.getUTCMonth() + 1;
    const d = value.getUTCDate();
    return makeDate(m, d);
  }

  // ② 엑셀 날짜 일련번호 → XLSX.SSF.parse_date_code() 사용 (가장 정확)
  if (typeof value === 'number' && value > 36526 && value < 73050) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parsed = (XLSX.SSF as any).parse_date_code(value);
      if (parsed && parsed.m && parsed.d) return makeDate(parsed.m, parsed.d);
    } catch {
      // fallback 없음 — 아래 문자열 경로로는 오지 않으므로 null 반환
    }
    return null;
  }

  const str = String(value).trim();

  // ③ "MM월 DD일" 또는 "M월 D일" (한국어)
  const koMatch = str.match(/(\d{1,2})월\s*(\d{1,2})일/);
  if (koMatch) return makeDate(parseInt(koMatch[1], 10), parseInt(koMatch[2], 10));

  // ④ "YYYY-MM-DD" 또는 "YYYY-MM-DD HH:MM:SS" (ISO / datetime)
  const isoMatch = str.match(/\d{4}-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) return makeDate(parseInt(isoMatch[1], 10), parseInt(isoMatch[2], 10));

  // ⑤ "YYYY.MM.DD" (점 구분 — 한국 카드사 엑셀에 흔함)
  const dotFullMatch = str.match(/\d{4}\.(\d{1,2})\.(\d{1,2})/);
  if (dotFullMatch) return makeDate(parseInt(dotFullMatch[1], 10), parseInt(dotFullMatch[2], 10));

  // ⑥ "YYYY/MM/DD" (슬래시 + 연도)
  const slashFullMatch = str.match(/\d{4}\/(\d{1,2})\/(\d{1,2})/);
  if (slashFullMatch) return makeDate(parseInt(slashFullMatch[1], 10), parseInt(slashFullMatch[2], 10));

  // ⑦ "MM/DD" 또는 "M/D" (연도 없는 슬래시)
  const slashMatch = str.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (slashMatch) return makeDate(parseInt(slashMatch[1], 10), parseInt(slashMatch[2], 10));

  // ⑧ "MM.DD" 또는 "M.D" (연도 없는 점 구분)
  const dotShortMatch = str.match(/^(\d{1,2})\.(\d{1,2})$/);
  if (dotShortMatch) return makeDate(parseInt(dotShortMatch[1], 10), parseInt(dotShortMatch[2], 10));

  // ⑨ 숫자 문자열이 날짜 시리얼처럼 보이면 재시도 (텍스트로 저장된 경우)
  const numStr = parseFloat(str);
  if (!isNaN(numStr) && numStr > 36526 && numStr < 73050) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parsed = (XLSX.SSF as any).parse_date_code(numStr);
      if (parsed && parsed.m && parsed.d) return makeDate(parsed.m, parsed.d);
    } catch { /* ignore */ }
  }

  return null;
}

// ── 날짜값에서 연도만 추출 ────────────────────────────────────────────────────
function parseYearFromDateValue(value: unknown): number | null {
  if (value instanceof Date && !isNaN(value.getTime())) return value.getUTCFullYear();
  const str = String(value ?? '').trim();
  // YYYY- / YYYY. / YYYY/ 패턴
  const m = str.match(/^(\d{4})[.\-\/]/);
  if (m) return parseInt(m[1], 10);
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
// 1단계: 정확 일치 → 2단계: 공백 제거 후 일치 → 3단계: 포함(contains) 일치
function getCol(row: Record<string, unknown>, ...keys: string[]): unknown {
  const rowKeys = Object.keys(row);

  for (const key of keys) {
    // 1단계: 정확히 일치
    if (row[key] !== undefined && row[key] !== null && row[key] !== '') return row[key];

    // 2단계: 공백 제거 후 정확 일치
    const normalKey = key.replace(/\s/g, '');
    const exact = rowKeys.find((k) => k.trim().replace(/\s/g, '') === normalKey);
    if (exact && row[exact] !== undefined && row[exact] !== null && row[exact] !== '') {
      return row[exact];
    }

    // 3단계: 포함(contains) — "이용일"로 "이용일자"도 매칭
    const partial = rowKeys.find((k) => {
      const nk = k.trim().replace(/\s/g, '');
      return nk.includes(normalKey) || normalKey.includes(nk);
    });
    if (partial && row[partial] !== undefined && row[partial] !== null && row[partial] !== '') {
      return row[partial];
    }
  }
  return undefined;
}

// ── 헤더가 몇 번째 행에 있는지 자동 탐지 ──────────────────────────────────────
// 카드사 엑셀은 상단에 안내문구가 여러 행 있고 실제 헤더가 아래에 있는 경우가 많음
const DATE_KEYWORDS   = ['날짜', '일자', '거래일', '결제일', '이용일', '승인일', 'date', '거래일시', '이용일시'];
const AMOUNT_KEYWORDS = ['금액', '이용금액', '승인금액', '청구금액', '결제금액', '지출금액', '합계금액', 'amount'];
const ITEM_KEYWORDS   = ['내역', '이용처', '가맹점', '거래내역', '적요', '상품명', '품목', '항목', '이용내역', 'item'];

function findHeaderRow(sheet: XLSX.WorkSheet): number {
  // aoa_to_json으로 원시 배열 읽기
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });

  for (let r = 0; r < Math.min(aoa.length, 15); r++) {
    const row = aoa[r] as unknown[];
    const cells = row.map((c) => String(c ?? '').trim().replace(/\s/g, '').toLowerCase());
    // 날짜·금액·내역 키워드 중 2개 이상 매칭되면 헤더 행으로 판단
    let matches = 0;
    for (const cell of cells) {
      if (DATE_KEYWORDS.some((k) => cell.includes(k.toLowerCase()))) matches++;
      else if (AMOUNT_KEYWORDS.some((k) => cell.includes(k.toLowerCase()))) matches++;
      else if (ITEM_KEYWORDS.some((k) => cell.includes(k.toLowerCase()))) matches++;
    }
    if (matches >= 2) return r;
  }
  return 0; // 못 찾으면 기본 0행
}

// ── 헤더 행을 지정해서 sheet_to_json 파싱 ────────────────────────────────────
function parseSheetFromRow(sheet: XLSX.WorkSheet, headerRow: number): Record<string, unknown>[] {
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '', raw: true });
  if (aoa.length <= headerRow) return [];

  const headers = (aoa[headerRow] as unknown[]).map((h) => String(h ?? '').trim());
  const result: Record<string, unknown>[] = [];

  for (let r = headerRow + 1; r < aoa.length; r++) {
    const rowArr = aoa[r] as unknown[];
    const obj: Record<string, unknown> = {};
    headers.forEach((h, i) => {
      if (h) obj[h] = rowArr[i] ?? '';
    });
    result.push(obj);
  }
  return result;
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

// 파일명에서 카드사 감지 → 지불방법 기본값 반환
export function detectCardFromFilename(filename: string): string | null {
  const name = filename.replace(/\.[^.]+$/, ''); // 확장자 제거
  const CARDS: { keyword: string; label: string }[] = [
    { keyword: '하나', label: '하나카드' },
    { keyword: '삼성', label: '삼성카드' },
    { keyword: '국민', label: '국민카드' },
    { keyword: '현대', label: '현대카드' },
    { keyword: '신한', label: '신한카드' },
    { keyword: '롯데', label: '롯데카드' },
    { keyword: '우리', label: '우리카드' },
    { keyword: 'bc', label: 'BC카드' },
    { keyword: 'BC', label: 'BC카드' },
  ];
  for (const { keyword, label } of CARDS) {
    if (name.includes(keyword)) return label;
  }
  return null;
}

export function importFromExcel(file: ArrayBuffer, defaultPaymentMethod?: string): ImportResult {
  // cellDates:true → 날짜 셀을 JS Date 객체로 변환 (raw:true와 함께 쓰면 충돌하므로 제거)
  const wb = XLSX.read(file, { type: 'array', cellDates: true });
  const warnings: string[] = [];
  const todayYear  = new Date().getFullYear();
  const todayMonth = new Date().getMonth() + 1;

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

    // 헤더 행 자동 탐지 (카드사 엑셀처럼 상단에 안내문구가 있어도 동작)
    const headerRow = findHeaderRow(sheet);
    const rows = parseSheetFromRow(sheet, headerRow);

    // ── 상세 진단 (항상 출력) ─────────────────────
    {
      const cols = Object.keys(rows[0] ?? {}).filter((k) => k.trim());
      warnings.push(`🗂️ 시트: "${sheetName}" | 헤더위치: ${headerRow + 1}행 | 데이터행: ${rows.length}개`);
      warnings.push(`📋 컬럼목록: ${cols.join(' / ') || '(없음)'}`);
      if (rows.length > 0) {
        const first = rows[0];
        const sample = cols.slice(0, 5).map((k) => `${k}="${String(first[k] ?? '').slice(0,20)}"`).join(', ');
        warnings.push(`🔍 첫행샘플: ${sample}`);
        // 날짜/금액/내역 각각 어떤 값을 찾았는지
        const dv = getCol(first, '날짜','일자','거래일','결제일','이용일','승인일','거래일시','이용일시','승인일시','date');
        const av = getCol(first, '금액','이용금액','승인금액','청구금액','결제금액','지출금액','합계금액','국내이용금액','원화금액','amount');
        const iv = getCol(first, '내역','이용처','가맹점명','가맹점','거래내역','이용내역','적요','상품명','품목','항목','지출내역','item');
        warnings.push(`📅 날짜값: "${String(dv ?? '못찾음')}" | 💰 금액값: "${String(av ?? '못찾음')}" | 📝 내역값: "${String(iv ?? '못찾음')}"`);
      }
    }

    let added = 0;
    for (const row of rows) {
      // ── 날짜 ──────────────────────────────────
      const dateVal = getCol(row,
        '날짜', '일자', '거래일', '결제일', '이용일', '승인일', '지출날짜', '지출 날짜',
        '거래일시', '이용일시', '승인일시', 'date',
      );
      const parsedDate = parseExcelDate(dateVal);
      const month = parsedDate?.month ?? todayMonth;
      const day   = parsedDate?.day   ?? new Date().getDate();
      const dateStr = parsedDate?.dateStr
        ?? `${String(todayMonth).padStart(2, '0')}월 ${String(new Date().getDate()).padStart(2, '0')}일`;

      // ── 연도 결정 ───────────────────────────────
      // 날짜에 연도가 명시돼 있으면 우선 사용, 없으면 시트명에서 추출한 연도 사용
      const parsedYear = parseYearFromDateValue(dateVal);
      let year = parsedYear ?? sheetYear;
      // 아직 오지 않은 달(미래)이면 전년도로 자동 보정
      // 예: 오늘이 2026년 5월인데 11월/12월이면 → 2025년으로
      if (year > todayYear || (year === todayYear && month > todayMonth)) {
        year = year - 1;
      }

      // ── 금액 ──────────────────────────────────
      const amountVal = getCol(row,
        '금액', '이용금액', '승인금액', '청구금액', '결제금액', '지출금액', '합계금액',
        '국내이용금액', '원화금액', 'amount',
      );
      const amount = parseExcelAmount(amountVal);

      // ── 필수값 검사 ───────────────────────────
      const item = String(getCol(row,
        '내역', '이용처', '가맹점명', '가맹점', '거래내역', '이용내역', '적요',
        '상품명', '품목', '항목', '지출내역', 'item',
      ) ?? '').trim();
      if (!item && amount === 0) continue; // 완전히 빈 행 스킵
      // 합계·소계 행 스킵
      if (/^(합계|소계|총계|total|sum)/i.test(item)) continue;

      // ── 사용목적 ──────────────────────────────
      const purposeRaw = String(getCol(row, '사용목적', 'purpose', '분류') ?? '').trim();
      const purpose: Purpose = ['생활용', '사업용', '개인용'].includes(purposeRaw)
        ? (purposeRaw as Purpose)
        : '생활용';

      // ── 나머지 컬럼 ───────────────────────────
      const place = String(getCol(row,
        '구매처', '가맹점명', '가맹점', '상호', '거래처', '쇼핑몰', '이용처', 'place',
      ) ?? '').trim();
      const category = String(getCol(row, '카테고리', '종류', 'category') ?? '').trim();
      const person = String(getCol(row, '지출한사람', '지출한 사람', 'person', '이름', '사용자', '지출') ?? '').trim();
      const memo = String(getCol(row,
        '기타', '메모', 'memo', '비고', '할부', '할부?', '할부개월', '할부여부', '매출',
      ) ?? '').trim();
      const pmRaw = String(getCol(row, '지출방법', '지불방법', '결제방법', 'paymentMethod') ?? '').trim();
      const VALID_METHODS: PaymentMethod[] = ['현금', '체크카드', '신용카드', '계좌이체', '기타'];
      // 엑셀에 지불방법이 명시돼 있으면 그걸 쓰고, 없으면 파일명에서 감지한 카드명 사용
      const paymentMethod: PaymentMethod = VALID_METHODS.includes(pmRaw as PaymentMethod)
        ? (pmRaw as PaymentMethod)
        : (defaultPaymentMethod as PaymentMethod | undefined) ?? '기타';

      expenses.push({
        id: generateId(),
        purpose,
        date: dateStr,
        year,
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
      // 요약·안내 시트명이면 경고 생략 (카드사 엑셀에 흔히 존재)
      const skipNames = /요약|통계|안내|guide|summary|total|합계|README/i;
      if (!skipNames.test(sheetName)) {
        warnings.push(`"${sheetName}" 시트에서 가져올 데이터를 찾지 못했어요`);
      }
    }
  }

  return { expenses, categories, persons, warnings };
}
