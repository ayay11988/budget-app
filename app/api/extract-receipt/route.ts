// ===================================================
// 영수증 이미지 OCR API (Claude Vision)
// POST /api/extract-receipt
// ===================================================

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `당신은 한국 영수증/지출 이미지(영수증 사진, 카드 사용 내역 캡처, 계좌이체 내역 등)에서 데이터를 추출하는 OCR 도우미입니다.
다음 JSON 배열 형식으로만 응답하세요 (다른 설명 금지):
[{"date":"MM월 DD일","item":"내역","place":"구매처","amount":숫자,"method":"현금|체크카드|신용카드|계좌이체|기타"}]
여러 항목이 있으면 각각 분리해서 배열로 반환.
불확실한 필드는 빈 문자열 또는 0으로 두세요.
연도 정보가 없으면 현재 연도로 가정.
금액은 콤마와 원(₩) 기호 제거 후 숫자만 반환.
method는 반드시 현금, 체크카드, 신용카드, 계좌이체, 기타 중 하나만 사용.`;

export async function POST(req: NextRequest) {
  try {
    const { base64, mimeType } = await req.json();

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json([], { status: 200 });
    }

    if (!base64) {
      return NextResponse.json({ error: '이미지 데이터가 없어요' }, { status: 400 });
    }

    // Claude Vision API 호출
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
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
                  | 'image/jpeg'
                  | 'image/png'
                  | 'image/gif'
                  | 'image/webp',
                data: base64,
              },
            },
            {
              type: 'text',
              text: '이 이미지에서 지출 정보를 추출해주세요.',
            },
          ],
        },
      ],
    });

    // 응답 파싱
    const text = response.content[0].type === 'text' ? response.content[0].text : '[]';
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return NextResponse.json([]);

    const items = JSON.parse(jsonMatch[0]);
    return NextResponse.json(items);
  } catch (error) {
    console.error('[/api/extract-receipt] 오류:', error);
    return NextResponse.json(
      { error: '영수증 인식 중 오류가 발생했어요 😢' },
      { status: 500 }
    );
  }
}
