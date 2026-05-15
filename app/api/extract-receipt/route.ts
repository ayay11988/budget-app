// ===================================================
// 영수증/표 이미지 OCR API (Claude Vision)
// 실제 영수증 + 엑셀/앱 스크린샷 모두 처리
// ===================================================

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `당신은 한국 지출 이미지에서 데이터를 추출하는 OCR 전문가입니다.
이미지는 실제 영수증일 수도 있고, 엑셀/앱/쇼핑몰의 주문내역 스크린샷, 카드 사용내역, 계좌이체 내역일 수 있습니다.

【표/스프레드시트 형태의 이미지일 경우】
1. 먼저 컬럼 헤더를 파악하세요 (날짜, 내역, 구매처, 금액, 종류, 지출방법 등)
2. 헤더 행은 제외하고, 데이터 행만 추출하세요
3. 각 행을 하나의 항목으로 변환하세요
4. "구매처" 또는 "상호명" 컬럼이 있으면 반드시 place 필드에 넣으세요
5. "종류"나 "카테고리" 컬럼의 값은 무시하세요 (AI가 나중에 분류합니다)

【금액 처리】
- 콤마(,)와 통화기호(₩, 원)를 제거하고 숫자만 반환
- 소계/합계/총계 행은 제외

【날짜 처리】
- "04월 22일", "4/22", "2026-04-22" 모두 "MM월 DD일" 형식으로 통일
- 연도 정보 없으면 현재 연도로 가정

【지출방법】
- 이미지에서 명확하게 읽히면 현금|체크카드|신용카드|계좌이체 중 하나
- 불명확하면 "기타"

반드시 아래 JSON 배열 형식으로만 응답하세요 (설명 없이 JSON만):
[{"date":"MM월 DD일","item":"내역","place":"구매처","amount":숫자,"method":"현금|체크카드|신용카드|계좌이체|기타"}]

주의:
- 여러 항목이면 각각 분리해서 배열로
- 불확실한 필드는 빈 문자열("") 또는 0
- 내역은 이미지에 보이는 그대로 정확하게 읽어주세요`;

export async function POST(req: NextRequest) {
  try {
    const { base64, mimeType } = await req.json();

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json([]);
    }
    if (!base64) {
      return NextResponse.json({ error: '이미지 데이터가 없어요' }, { status: 400 });
    }

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: (mimeType || 'image/jpeg') as
                  | 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                data: base64,
              },
            },
            {
              type: 'text',
              text: '이 이미지에서 지출 항목을 모두 추출해주세요. 표 형태라면 헤더를 제외한 모든 데이터 행을 추출해주세요.',
            },
          ],
        },
      ],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '[]';

    // JSON 추출 (앞뒤 텍스트 제거)
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return NextResponse.json([]);

    const items = JSON.parse(jsonMatch[0]);

    // 유효하지 않은 항목(amount=0이고 item 없음) 제거
    const valid = items.filter(
      (it: { item?: string; amount?: number }) => it.item || (it.amount && it.amount > 0)
    );

    return NextResponse.json(valid);
  } catch (error) {
    console.error('[/api/extract-receipt] 오류:', error);
    return NextResponse.json({ error: '영수증 인식 중 오류가 발생했어요 😢' }, { status: 500 });
  }
}
