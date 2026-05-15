// ===================================================
// 월별 탭 컴포넌트
// 가로 스크롤 가능, 탭마다 해당 월 총 지출액 표시
// ===================================================

'use client';

import { useEffect, useRef } from 'react';
import { useBudgetStore, getAvailableMonths } from '@/lib/store';
import { formatAmount, getCurrentYearMonth } from '@/lib/utils';

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

  return (
    <div
      ref={scrollRef}
      className="month-tabs-scroll flex gap-2 px-4 py-3 bg-white border-b border-pink-100"
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
                ? 'bg-pink-400 text-white shadow-card'
                : 'bg-pastel-pink text-pink-700 hover:bg-pink-200'
              }
            `}
          >
            <span className="whitespace-nowrap">{m.label}</span>
            {m.total > 0 && (
              <span className={`text-xs mt-0.5 ${isActive ? 'text-pink-100' : 'text-pink-400'}`}>
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
        className="flex-shrink-0 px-4 py-2 rounded-2xl text-sm text-pink-300 border border-dashed border-pink-200 hover:border-pink-400 hover:text-pink-500 transition-colors"
        title="이번 달로 이동"
      >
        + 이번 달
      </button>
    </div>
  );
}
