// ===================================================
// 루트 레이아웃 - 모든 페이지에 공통 적용
// ===================================================

import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '🌸 아맹이 가계뿌',
  description: '사업용·생활용·개인용 지출을 한눈에 관리하는 스마트 가계부',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-[#FFF8F9]">
        {children}
      </body>
    </html>
  );
}
