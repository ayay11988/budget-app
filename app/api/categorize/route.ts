// ===================================================
// AI 카테고리 자동 분류 API
// POST /api/categorize
// ===================================================

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// 시스템 프롬프트: Claude에게 카테고리 분류 규칙 설명
const SYSTEM_PROMPT = `당신은 한국어 가계부의 카테고리 분류기입니다.
사용자의 카테고리는 단순 이름이 아니라 '판단 기준 설명'을 가지고 있습니다.
내역, 구매처, 금액, 사용목적을 보고 가장 적합한 카테고리를 골라주세요.

특히 다음 구분에 주의하세요:
1. '생활용' 식비 vs '개인용' 개인 식비
   → 파트너와 함께 먹은 것(장보기, 집 배달)은 생활용 식비
   → 혼자 또는 친구와 각자 계산한 것은 개인 식비
2. '생활용' 외식 및 유흥 vs '개인용' 개인 유흥
   → 파트너와 함께한 외식·데이트는 외식 및 유흥
   → 파트너 외의 사람과의 모임은 개인 유흥
3. '생활용' 교통비 vs '개인용' 개인 교통비
   → 파트너와 함께 이동한 것은 생활용 교통비
   → 혼자 이동(택시, 대리, 주차)은 개인 교통비
4. '생활용' 병원비 vs '개인용' 의료비
   → 함께 관리하는 피부미용·건강보조는 생활용 병원비
   → 혼자 아파서 간 곳은 개인용 의료비
5. '생활용' 생활비 vs '개인용' 화장품/의복구매
   → 같이 쓰는 소모품은 생활비
   → 본인만 쓰는 화장품·옷은 개인용
6. '사업용' 카테고리는 학원/강의/조교/교재 등 사업 관련 키워드가 있을 때만 선택

응답은 반드시 JSON 형식으로만 (다른 설명 금지):
{"category": "카테고리명", "purpose": "생활용|사업용|개인용", "confidence": 0.0~1.0, "reason": "분류 이유 한 줄"}

확신이 낮으면 confidence를 0.5 이하로 주세요.
목록에 없으면 {"category": null, "purpose": null, "confidence": 0, "reason": "적합한 카테고리 없음"} 반환.`;

export async function POST(req: NextRequest) {
  try {
    const { item, place, amount, purpose, categories } = await req.json();

    // API 키 미설정 시 빈 결과 반환 (앱은 동작하되 AI 기능만 비활성화)
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({
        category: null,
        purpose: null,
        confidence: 0,
        reason: 'API 키가 설정되지 않았어요',
      });
    }

    // 카테고리 목록을 사람이 읽기 쉬운 형태로 변환
    const categoryList = (categories as { purpose: string; name: string; description: string }[])
      .map((c) => `[${c.purpose}] ${c.name}: ${c.description}`)
      .join('\n');

    const userMessage = `내역: ${item || '(없음)'}
구매처: ${place || '(없음)'}
금액: ${amount ? `${amount.toLocaleString()}원` : '(없음)'}
${purpose ? `사용목적(입력됨): ${purpose}` : ''}

사용 가능한 카테고리 목록:
${categoryList}`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    // 응답 파싱
    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('JSON 파싱 실패');

    const result = JSON.parse(jsonMatch[0]);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[/api/categorize] 오류:', error);
    return NextResponse.json(
      { category: null, purpose: null, confidence: 0, reason: '분류 중 오류가 발생했어요' },
      { status: 200 } // 앱이 멈추지 않도록 200 반환
    );
  }
}
