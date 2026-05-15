// ===================================================
// 날짜·금액 포맷 등 전반적으로 쓰이는 유틸리티 함수
// ===================================================

import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Purpose, PaymentMethod } from './types';

// ── 금액 포맷 ────────────────────────────────────────
/** 숫자를 ₩123,456 형식으로 변환 */
export function formatAmount(amount: number): string {
  return `₩${amount.toLocaleString('ko-KR')}`;
}

/** 입력 중인 숫자 문자열에 천단위 콤마 적용 */
export function formatAmountInput(value: string): string {
  const num = value.replace(/[^0-9]/g, '');
  if (!num) return '';
  return Number(num).toLocaleString('ko-KR');
}

/** 포맷된 금액 문자열에서 숫자만 추출 */
export function parseAmount(value: string): number {
  return parseInt(value.replace(/[^0-9]/g, '') || '0', 10);
}

// ── 날짜 포맷 ────────────────────────────────────────
/** Date 객체를 "MM월 DD일" 형식으로 변환 */
export function formatDateKo(date: Date): string {
  return format(date, 'MM월 dd일', { locale: ko });
}

/** Date 객체에서 연도 추출 */
export function getYear(date: Date): number {
  return date.getFullYear();
}

/** Date 객체에서 월 추출 (1~12) */
export function getMonth(date: Date): number {
  return date.getMonth() + 1;
}

/** Date 객체에서 일 추출 (1~31) */
export function getDay(date: Date): number {
  return date.getDate();
}

/** "MM월 DD일" 문자열 파싱해서 월·일 반환 */
export function parseDateKo(dateStr: string): { month: number; day: number } | null {
  const match = dateStr.match(/(\d{1,2})월\s*(\d{1,2})일/);
  if (!match) return null;
  return { month: parseInt(match[1], 10), day: parseInt(match[2], 10) };
}

/** 연도와 월을 "2026년 5월" 형식으로 변환 */
export function getMonthLabel(year: number, month: number): string {
  return `${year}년 ${month}월`;
}

/** 현재 연도·월 반환 */
export function getCurrentYearMonth(): { year: number; month: number } {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

/** 오늘 날짜를 "MM월 DD일" 형식으로 반환 */
export function getTodayFormatted(): string {
  return formatDateKo(new Date());
}

// ── 정렬 유틸 ────────────────────────────────────────
/** 지출 항목을 날짜 내림차순으로 비교하는 함수 */
export function compareExpenseDateDesc(
  a: { year: number; month: number; day: number },
  b: { year: number; month: number; day: number }
): number {
  if (a.year !== b.year) return b.year - a.year;
  if (a.month !== b.month) return b.month - a.month;
  return b.day - a.day;
}

// ── 색상·스타일 유틸 ─────────────────────────────────
/** 사용목적에 따른 Tailwind 배경/텍스트 색상 클래스 */
export function getPurposeColorClass(purpose: Purpose): string {
  switch (purpose) {
    case '생활용': return 'bg-pink-100 text-pink-700';
    case '사업용': return 'bg-blue-100 text-blue-700';
    case '개인용': return 'bg-green-100 text-green-700';
    default: return 'bg-gray-100 text-gray-600';
  }
}

/** 사용목적에 따른 행 배경색 (엑셀 내보내기용) */
export function getPurposeBgColor(purpose: Purpose): string {
  switch (purpose) {
    case '생활용': return 'FFE4EC';  // 파스텔 핑크
    case '사업용': return 'D4E6FF';  // 파스텔 블루
    case '개인용': return 'D4F4E6';  // 파스텔 민트
    default: return 'FFFFFF';
  }
}

/** 사용목적 이모지 */
export function getPurposeEmoji(purpose: string): string {
  switch (purpose) {
    case '생활용': return '🏠';
    case '사업용': return '💼';
    case '개인용': return '🌸';
    default: return '';
  }
}

/** 지출방법 이모지 */
export function getPaymentEmoji(method: PaymentMethod | string): string {
  switch (method) {
    case '현금':   return '💵';
    case '체크카드': return '💳';
    case '신용카드': return '💎';
    case '계좌이체': return '🏦';
    case '기타':   return '•';
    default: return '';
  }
}

// ── ID 생성 ──────────────────────────────────────────
/** 간단한 고유 ID 생성 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// ── 차트 색상 ─────────────────────────────────────────
export const CHART_COLORS = {
  생활용: '#FFB3CB',
  사업용: '#93C5FD',
  개인용: '#86EFAC',
};

export const PASTEL_PALETTE = [
  '#FFB3CB', '#93C5FD', '#86EFAC',
  '#FDE68A', '#C4B5FD', '#FDBA74',
  '#67E8F9', '#F9A8D4', '#A3E635',
];
