// ===================================================
// 앱 최초 실행 시 기본으로 등록되는 카테고리 데이터
// 사용자가 "설정 > 카테고리 관리"에서 수정 가능
// ===================================================

import { Category, Purpose } from './types';

interface SeedCategory {
  purpose: Purpose;
  name: string;
  description: string;
}

export const SEED_CATEGORY_DATA: SeedCategory[] = [
  // ── 생활용 (파트너와 함께 쓰는 비용) ────────────────────────
  { purpose: '생활용', name: '공과금',       description: '전기, 가스, 수도' },
  { purpose: '생활용', name: '고정지출',     description: '집대출이자, 관리비, OTT, 정기구독료, 정수기' },
  { purpose: '생활용', name: '교통비',       description: '같이 이동할 때 쓴 비용' },
  { purpose: '생활용', name: '병원비',       description: '같이 관리하는 피부미용비, 같이 섭취하는 건강보조식품류 구매비 (협의 필요)' },
  { purpose: '생활용', name: '생활비',       description: '먹는 것 제외하고 실생활에 필요한 소모품' },
  { purpose: '생활용', name: '접대비',       description: '서로 합의된 손님 초대로 인한 비용' },
  { purpose: '생활용', name: '여행비',       description: '각자의 개인 지출 외에 함께 지불하는 것' },
  { purpose: '생활용', name: '식비',         description: '장보기, 집에서 먹는 배달음식 포함' },
  { purpose: '생활용', name: '외식 및 유흥', description: '밖에서 사먹는 술을 곁들인 외식류(기분 내는 용), 노래방, 시설이용비용, 입장료 종류의 모든 데이트와 관련한 것' },

  // ── 사업용 (수학강사 사업 관련) ─────────────────────────────
  { purpose: '사업용', name: '조교접대',   description: '조교 식대 지원 시' },
  { purpose: '사업용', name: '학생접대',   description: '단체로 식당에서 음식을 사먹거나 배달 어플로 다량의 음료를 샀을 경우, 간식 구매비' },
  { purpose: '사업용', name: '조교비',     description: '현금으로 지급되고 비용처리할 예정' },
  { purpose: '사업용', name: '교재제작',   description: '북펀딩 사이트에 매번 사업자 비용처리 중' },
  { purpose: '사업용', name: '구독료',     description: '매스홀릭, 제미나이, 클로드 등' },
  { purpose: '사업용', name: '통신비',     description: '사업용 휴대폰, 인터넷 요금 등' },

  // ── 개인용 (혼자 쓰는 비용) ─────────────────────────────────
  { purpose: '개인용', name: '의료비',       description: '진짜 어디 아픈 거' },
  { purpose: '개인용', name: '의복구매',     description: '옷, 신발, 가방 등' },
  { purpose: '개인용', name: '개인 식비',    description: '혼자 끼니를 때운 것, 친구 만나서 놀고 각자 먹은 식비, 엔빵' },
  { purpose: '개인용', name: '화장품',       description: '색조류, 같이 안 쓰는 화장품' },
  { purpose: '개인용', name: '고정 쁘띠',   description: '헤어, 네일, 속눈썹' },
  { purpose: '개인용', name: '반짝 쁘띠',   description: '성형외과, 피부과 등' },
  { purpose: '개인용', name: '개인 유흥',   description: '파트너 외 다른 사람과 밥, 커피, 술, 노래방 등을 이용한 금액' },
  { purpose: '개인용', name: '개인 교통비', description: '택시비, 대리비, 주차비 등' },
  { purpose: '개인용', name: '건강보조',    description: '혼자 먹는 영양제' },
  { purpose: '개인용', name: '구독료',      description: '개인 OTT, 앱, 서비스 구독' },
];

// ID를 붙여서 Category 타입으로 변환
export const SEED_CATEGORIES: Category[] = SEED_CATEGORY_DATA.map((c, i) => ({
  ...c,
  id: `seed-${i}`,
}));
