// ===================================================
// 메인 가계부 화면
// - 영수증/이미지 업로드가 주 입력 방법
// - 테이블 최하단 행에서 직접 타이핑도 가능
// ===================================================

'use client';

import { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import Link from 'next/link';
import { useBudgetStore } from '@/lib/store';
import MonthTabs from '@/components/MonthTabs';
import Dashboard from '@/components/Dashboard';
import ExpenseTable from '@/components/ExpenseTable';
import FilterBar from '@/components/FilterBar';
import ReceiptUploader from '@/components/ReceiptUploader';
import ExcelImportExport from '@/components/ExcelImportExport';
import { Settings, Camera, ChevronUp, ChevronDown, BarChart2 } from 'lucide-react';
import { useCloudSync } from '@/hooks/useCloudSync';

export default function HomePage() {
  useCloudSync(); // ☁️ 클라우드 자동 동기화
  const { settings, setInitialized } = useBudgetStore();
  const [showWelcome, setShowWelcome] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showFilter, setShowFilter] = useState(false);

  useEffect(() => {
    if (!settings.hasInitialized) setShowWelcome(true);
  }, [settings.hasInitialized]);

  function closeWelcome() {
    setInitialized();
    setShowWelcome(false);
  }

  return (
    <div className="min-h-screen bg-[#FFF8F9] flex flex-col">
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            fontFamily: 'Noto Sans KR, sans-serif',
            borderRadius: '12px',
            fontSize: '13px',
          },
        }}
      />

      {/* ── 헤더 ── */}
      <header className="bg-white border-b border-pink-100 px-3 py-2.5 flex items-center justify-between sticky top-0 z-40 shadow-soft">
        <div className="flex items-center gap-2">
          <span className="text-lg">🌸</span>
          <h1 className="text-sm font-bold text-pink-700">아맹이 가계뿌</h1>
        </div>

        <div className="flex items-center gap-1.5">
          {/* 통계 토글 */}
          <button
            onClick={() => setShowDashboard((v) => !v)}
            className={`flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-xl transition-colors ${
              showDashboard ? 'bg-purple-100 text-purple-700' : 'text-gray-400 hover:bg-gray-100'
            }`}
          >
            <BarChart2 size={14} />
            <span className="hidden sm:inline">통계</span>
          </button>

          {/* 필터 토글 (모바일용) */}
          <button
            onClick={() => setShowFilter((v) => !v)}
            className={`lg:hidden flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-xl transition-colors ${
              showFilter ? 'bg-pink-100 text-pink-700' : 'text-gray-400 hover:bg-gray-100'
            }`}
          >
            🔍
          </button>

          {/* 엑셀 가져오기/내보내기 */}
          <ExcelImportExport />

          {/* 설정 */}
          <Link
            href="/settings"
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
            title="설정"
          >
            <Settings size={16} />
          </Link>
        </div>
      </header>

      {/* ── 월별 탭 ── */}
      <MonthTabs />

      {/* ── 대시보드 (접기/펼치기) ── */}
      {showDashboard && (
        <div className="border-b border-pink-50 fade-in">
          <Dashboard />
        </div>
      )}

      {/* ── 이미지로 추가 버튼 (메인 액션) ── */}
      <div className="px-3 pt-3 pb-2">
        <button
          onClick={() => setShowReceipt(true)}
          className="w-full flex items-center justify-center gap-2.5 py-3 bg-gradient-to-r from-pink-400 to-purple-400 hover:from-pink-500 hover:to-purple-500 text-white rounded-2xl shadow-soft transition-all active:scale-[0.98] font-medium text-sm"
        >
          <Camera size={18} />
          📸 영수증 · 카드내역 이미지로 자동 추가
        </button>
        <p className="text-center text-[11px] text-gray-400 mt-1.5">
          이미지를 올리면 AI가 내역을 읽어서 자동으로 입력해줘요 ✨ · 아래 표에서 직접 타이핑도 가능해요
        </p>
      </div>

      {/* ── 메인 컨텐츠 ── */}
      <main className="flex gap-3 px-3 pb-6 flex-1">
        {/* 필터 사이드바 */}
        <div className={`${showFilter ? 'block' : 'hidden'} lg:block shrink-0`}>
          <FilterBar />
        </div>

        {/* 테이블 영역 */}
        <div className="flex-1 min-w-0 bg-white rounded-2xl shadow-soft overflow-hidden">
          <ExpenseTable />
        </div>
      </main>

      {/* ── 영수증 업로드 모달 ── */}
      {showReceipt && <ReceiptUploader onClose={() => setShowReceipt(false)} />}

      {/* ── 환영 모달 ── */}
      {showWelcome && (
        <div className="fixed inset-0 bg-black/40 modal-overlay z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-card w-full max-w-sm p-6 fade-in">
            <div className="text-center mb-5">
              <div className="text-5xl mb-3">🌷</div>
              <h2 className="text-xl font-bold text-pink-700 mb-1">어서오세요!</h2>
              <p className="text-sm text-gray-500">아맹이 가계뿌를 시작해볼까요? 💕</p>
            </div>

            <div className="bg-amber-50 rounded-2xl p-4 text-xs space-y-2 mb-5">
              <p className="font-semibold text-amber-700">💡 이렇게 써요!</p>
              <ol className="text-gray-600 space-y-1.5">
                <li>1️⃣ <strong>설정</strong> → <strong>사람 관리</strong>에서 이름 먼저 추가</li>
                <li>2️⃣ 📸 <strong>영수증 이미지 업로드</strong> → AI 자동 입력</li>
                <li>3️⃣ 표 맨 아래 노란 행에 직접 타이핑도 가능</li>
                <li>4️⃣ 📤 <strong>엑셀 내보내기</strong>로 주 1회 백업 권장</li>
              </ol>
            </div>

            <div className="flex gap-2">
              <Link
                href="/settings"
                onClick={closeWelcome}
                className="flex-1 px-4 py-2.5 text-sm text-center border border-pink-200 text-pink-600 rounded-2xl hover:bg-pink-50 transition-colors"
              >
                ⚙️ 설정 먼저
              </Link>
              <button
                onClick={closeWelcome}
                className="flex-1 px-4 py-2.5 text-sm bg-pink-400 hover:bg-pink-500 text-white rounded-2xl font-medium transition-colors"
              >
                시작! 🌸
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
