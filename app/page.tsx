// ===================================================
// 메인 가계부 화면
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
import AddExpenseRow from '@/components/AddExpenseRow';
import ReceiptUploader from '@/components/ReceiptUploader';
import ExcelImportExport from '@/components/ExcelImportExport';
import { Settings, Camera, PlusCircle, ChevronUp, ChevronDown } from 'lucide-react';

export default function HomePage() {
  const { settings, setInitialized, expenses } = useBudgetStore();
  const [showWelcome, setShowWelcome] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showDashboard, setShowDashboard] = useState(true);

  // 첫 실행 시 환영 모달 표시
  useEffect(() => {
    if (!settings.hasInitialized) {
      setShowWelcome(true);
    }
  }, [settings.hasInitialized]);

  function closeWelcome() {
    setInitialized();
    setShowWelcome(false);
  }

  return (
    <div className="min-h-screen bg-[#FFF8F9]">
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            fontFamily: 'Noto Sans KR, sans-serif',
            borderRadius: '12px',
            background: '#fff',
            color: '#333',
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          },
        }}
      />

      {/* ── 상단 헤더 ── */}
      <header className="bg-white border-b border-pink-100 px-4 py-3 flex items-center justify-between sticky top-0 z-40 shadow-soft">
        <div className="flex items-center gap-2">
          <span className="text-xl">🌸</span>
          <h1 className="text-base font-bold text-pink-700">아맹이 가계뿌</h1>
        </div>

        <div className="flex items-center gap-2">
          {/* 엑셀 가져오기/내보내기 */}
          <ExcelImportExport />

          {/* 영수증 업로드 */}
          <button
            onClick={() => setShowReceipt(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 text-sm rounded-xl transition-colors"
            title="영수증 사진으로 자동 입력"
          >
            <Camera size={15} />
            <span className="hidden sm:inline">영수증</span>
          </button>

          {/* 설정 */}
          <Link
            href="/settings"
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
            title="설정"
          >
            <Settings size={18} />
          </Link>
        </div>
      </header>

      {/* ── 월별 탭 ── */}
      <MonthTabs />

      {/* ── 대시보드 (접기/펼치기) ── */}
      <div className="border-b border-pink-50">
        <button
          onClick={() => setShowDashboard((v) => !v)}
          className="w-full flex items-center justify-center gap-1 py-1 text-xs text-gray-400 hover:text-gray-600 hover:bg-pink-50/50 transition-colors"
        >
          {showDashboard ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {showDashboard ? '통계 접기' : '통계 보기'}
        </button>
        {showDashboard && <Dashboard />}
      </div>

      {/* ── 메인 컨텐츠 ── */}
      <main className="flex gap-4 p-4 max-w-7xl mx-auto">
        {/* 필터 사이드바 (데스크탑에서만 표시) */}
        <div className="hidden lg:block">
          <FilterBar />
        </div>

        {/* 지출 목록 */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* 새 지출 추가 폼 (토글) */}
          {showAddForm ? (
            <div className="fade-in">
              <AddExpenseRow onClose={() => setShowAddForm(false)} />
            </div>
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-pink-200 rounded-2xl text-sm text-pink-400 hover:border-pink-400 hover:text-pink-600 hover:bg-pink-50/50 transition-all"
            >
              <PlusCircle size={18} />
              새 지출 추가하기
            </button>
          )}

          {/* 지출 테이블 */}
          <div className="bg-white rounded-2xl shadow-soft overflow-hidden">
            <ExpenseTable />
          </div>
        </div>
      </main>

      {/* ── 모바일 필터 버튼 (하단 고정) ── */}
      <div className="lg:hidden fixed bottom-4 left-4 right-4 flex gap-2 z-30">
        {/* 모바일에서는 필터를 간략화 - 나중에 추가 가능 */}
      </div>

      {/* ── 영수증 업로드 모달 ── */}
      {showReceipt && <ReceiptUploader onClose={() => setShowReceipt(false)} />}

      {/* ── 환영 모달 ── */}
      {showWelcome && (
        <div className="fixed inset-0 bg-black/40 modal-overlay z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-card w-full max-w-md p-6 fade-in">
            <div className="text-center mb-5">
              <div className="text-5xl mb-3">🌷</div>
              <h2 className="text-xl font-bold text-pink-700 mb-2">어서오세요!</h2>
              <p className="text-gray-500 text-sm">
                가계부를 시작해볼까요? 💕<br />
                먼저 설정에서 지출한 사람을 등록해두면<br />
                더 편리하게 사용할 수 있어요!
              </p>
            </div>

            {/* 사용 안내 */}
            <div className="bg-pastel-cream rounded-2xl p-4 text-sm space-y-2 mb-5">
              <p className="font-medium text-yellow-700">💡 시작 가이드</p>
              <ol className="text-xs text-gray-600 space-y-1.5">
                <li>1️⃣ <strong>설정</strong> → <strong>사람 관리</strong>에서 이름 추가</li>
                <li>2️⃣ <strong>+ 새 지출 추가</strong>로 지출 기록</li>
                <li>3️⃣ 📸 <strong>영수증 업로드</strong>로 자동 입력</li>
                <li>4️⃣ 📤 <strong>엑셀 내보내기</strong>로 주기적 백업 (주 1회 권장)</li>
              </ol>
            </div>

            {/* 기존 엑셀 파일이 있는 경우 */}
            {expenses.length === 0 && (
              <div className="text-xs text-center text-gray-400 mb-4">
                기존 엑셀 파일이 있다면 상단의 <strong>📥 엑셀 불러오기</strong>를 이용하세요
              </div>
            )}

            <div className="flex gap-2">
              <Link
                href="/settings"
                onClick={closeWelcome}
                className="flex-1 px-4 py-2.5 text-sm text-center border border-pink-200 text-pink-600 rounded-2xl hover:bg-pink-50 transition-colors"
              >
                ⚙️ 설정 바로가기
              </Link>
              <button
                onClick={closeWelcome}
                className="flex-1 px-4 py-2.5 text-sm bg-pink-400 hover:bg-pink-500 text-white rounded-2xl transition-colors font-medium"
              >
                시작하기 🌸
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
