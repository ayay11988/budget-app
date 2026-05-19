// ===================================================
// 월별 탭 컴포넌트
// 가로 스크롤 가능, 탭마다 해당 월 총 지출액 표시
// 아래 줄: 사용목적별 합계 표시
// ===================================================

'use client';

import { useEffect, useRef } from 'react';
import { useBudgetStore, getAvailableMonths, getMonthExpenses } from '@/lib/store';
import { formatAmount, getCurrentYearMonth, getPurposeEmoji } from '@/lib/utils';
import { Purpose } from '@/lib/types';

const PURPOSE_STYLES: Record<Purpose, { bar: string; label: string; dot: string }> = {
  '생활용': { bar: 'bg-yellow-100 border border-yellow-300', label: 'text-yellow-800', dot: 'bg-yellow-400' },
  '사업용': { bar: 'bg-sky-100 border border-sky-300',       label: 'text-sky-800',    dot: 'bg-sky-400'    },
  '개인용': { bar: 'bg-pink-100 border border-pink-300',     label: 'text-pink-800',   dot: 'bg-pink-400'   },
};

export default function MonthTabs() {
  const { expenses, selectedYear, selectedMonth, setSelectedMonth } = useBudgetStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  // 사용 가능한 월 목록 계산 (데이터가 있는 달)
  const months = getAvailableMonths(expenses);

  // 현재 월이 목록에 없으면 추가 (빈 달도 탭으로 표시)
  const { year: curY, month: curM } = getCurrentYearMonth();
  const hasCurrent = months.some((m) => m.year === curY && m.month === curM);
  if (!hasCurrent) {
    months.push({ year: curY, month: curM, total: 0, label: `${curY}년 ${curM}월` });
    months.sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });
  }

  // 선택된 탭으로 자동 스크롤
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const activeTab = container.querySelector('[data-active="true"]') as HTMLElement;
    if (activeTab) {
      activeTab.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [selectedYear, selectedMonth]);

  // 현재 선택 월의 목적별 합계
  const monthRows = getMonthExpenses(expenses, selectedYear, selectedMonth);
  const purposeTotals = (['생활용', '사업용', '개인용'] as Purpose[]).map((p) => ({
    purpose: p,
    total: monthRows.filter((e) => e.purpose === p).reduce((s, e) => s + e.amount, 0),
  }));

  return (
    <div className="bg-gray-800 border-b border-gray-700">
      {/* ── 월 탭 행 ── */}
      <div
        ref={scrollRef}
        className="month-tabs-scroll flex gap-2 px-4 py-3"
      >
        {months.map((m) => {
          const isActive = m.year === selectedYear && m.month === selectedMonth;
          return (
            <button
              key={`${m.year}-${m.month}`}
              data-active={isActive}
              onClick={() => setSelectedMonth(m.year, m.month)}
              className={`
                flex-shrink-0 flex flex-col items-center px-4 py-2 rounded-2xl
                text-sm font-medium transition-all duration-200
                ${isActive
                  ? 'bg-pink-500 text-white shadow-lg'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                }
              `}
            >
              <span className="whitespace-nowrap">{m.label}</span>
              {m.total > 0 && (
                <span className={`text-xs mt-0.5 ${isActive ? 'text-pink-200' : 'text-gray-400'}`}>
                  {formatAmount(m.total)}
                </span>
              )}
            </button>
          );
        })}

        {/* 새 달 추가 버튼 */}
        <button
          onClick={() => {
            const now = new Date();
            setSelectedMonth(now.getFullYear(), now.getMonth() + 1);
          }}
          className="flex-shrink-0 px-4 py-2 rounded-2xl text-sm text-gray-500 border border-dashed border-gray-600 hover:border-gray-400 hover:text-gray-300 transition-colors"
          title="이번 달로 이동"
        >
          + 이번 달
        </button>
      </div>

      {/* ── 목적별 합계 행 ── */}
      <div className="flex gap-3 px-4 pb-3">
        {purposeTotals.map(({ purpose, total }) => {
          const s = PURPOSE_STYLES[purpose];
          return (
            <div key={purpose} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl ${s.bar}`}>
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${s.dot}`} />
              <span className={`text-xs font-medium ${s.label}`}>
                {getPurposeEmoji(purpose)} {purpose}
              </span>
              <span className={`text-xs font-bold tabular-nums ${s.label}`}>
                {total > 0 ? formatAmount(total) : '₩0'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
