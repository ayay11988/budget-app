// ===================================================
// 가계부 앱 전체에서 사용하는 TypeScript 타입 정의
// ===================================================

// 지출 사용목적 (3가지 고정값)
export type Purpose = '생활용' | '사업용' | '개인용';

// 지출방법 (5가지 고정값)
export type PaymentMethod = '현금' | '체크카드' | '신용카드' | '계좌이체' | '기타';

// 카테고리 (사용자가 추가/수정/삭제 가능)
export interface Category {
  id: string;
  purpose: Purpose;         // 이 카테고리가 속한 사용목적
  name: string;             // 카테고리명 (예: "식비", "교통비")
  description: string;      // AI 분류에 활용되는 판단 기준 설명
}

// 지출한 사람 (사용자가 설정에서 추가/수정/삭제)
export interface Person {
  id: string;
  name: string;
}

// 지출 항목 (가계부 한 행 = 하나의 지출)
export interface Expense {
  id: string;
  purpose: Purpose;         // 사용목적
  date: string;             // 표시용 날짜: "MM월 DD일"
  year: number;             // 연도 (월별 탭 구분용)
  month: number;            // 월 (1~12)
  day: number;              // 일 (1~31)
  person: string;           // 지출한 사람 이름
  item: string;             // 내역 (예: "마트 장보기")
  place: string;            // 구매처 (예: "이마트")
  amount: number;           // 금액 (숫자, 원화)
  category: string;         // 카테고리명
  paymentMethod: PaymentMethod;
  memo: string;             // 기타 메모 (비용처리 상태 등 자유 기록)
  categoryConfidence?: number;  // AI 분류 신뢰도 (0.0~1.0)
  categoryReason?: string;      // AI 분류 이유 (한 줄)
  createdAt: string;        // 생성 시각 (ISO 문자열)
}

// 필터/검색 상태
export interface Filter {
  purposes: Purpose[];          // 선택된 사용목적 (빈 배열 = 전체)
  categories: string[];         // 선택된 카테고리명들
  persons: string[];            // 선택된 사람 이름들
  paymentMethods: PaymentMethod[];
  dateFrom: string;             // "YYYY-MM-DD" 또는 빈 문자열
  dateTo: string;
  amountMin: number | null;
  amountMax: number | null;
  searchText: string;           // 내역/구매처/메모 텍스트 검색
}

// 앱 전체 설정
export interface AppSettings {
  hasInitialized: boolean;      // 첫 실행 완료 여부 (환영 모달 표시용)
}

// AI 카테고리 자동 분류 결과
export interface CategorizationResult {
  category: string | null;
  purpose: Purpose | null;
  confidence: number;           // 0.0~1.0 (0.7 미만이면 노란색 경고 표시)
  reason: string;
}

// 영수증 OCR로 추출된 항목 (미리보기 모달용)
export interface ReceiptItem {
  date: string;                 // "MM월 DD일"
  item: string;
  place: string;
  amount: number;
  method: PaymentMethod | '';
}

// 엑셀 불러오기 모드
export type ImportMode = 'overwrite' | 'merge';

// 월별 집계 (탭 표시용)
export interface MonthSummary {
  year: number;
  month: number;
  total: number;
  label: string;  // "2026년 5월"
}

// 대시보드 차트용 데이터
export interface ChartDataPoint {
  name: string;
  value: number;
  color?: string;
}
