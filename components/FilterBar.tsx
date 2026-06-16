// ===================================================
// 필터/검색 사이드바 (어두운 톤)
// ===================================================

'use client';

import { useBudgetStore } from '@/lib/store';
import { Purpose, PaymentMethod } from '@/lib/types';
import { getPurposeEmoji, getPaymentEmoji, parseAmount } from '@/lib/utils';
import { Search, X, SlidersHorizontal } from 'lucide-react';

const PURPOSES: Purpose[] = ['생활용', '사업용', '개인용'];
const METHODS: PaymentMethod[] = ['현금', '체크카드', '신용카드', '계좌이체', '기타'];

export default function FilterBar({ onClose }: { onClose?: () => void }) {
  const { filter, setFilter, resetFilter, categories, persons } = useBudgetStore();

  const isFiltered =
    filter.purposes.length > 0 ||
    filter.categories.length > 0 ||
    filter.persons.length > 0 ||
    filter.paymentMethods.length > 0 ||
    !!filter.dateFrom || !!filter.dateTo ||
    filter.amountMin !== null || filter.amountMax !== null ||
    !!filter.searchText;

  function toggleArray<T>(arr: T[], item: T): T[] {
    return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];
  }

  // 체크박스 컴포넌트
  function FilterCheck({
    label, checked, onChange,
  }: { label: string; checked: boolean; onChange: () => void }) {
    return (
      <label className="flex items-center gap-2 cursor-pointer group">
        <div className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
          checked ? 'bg-pink-500 border-pink-500' : 'border-gray-500 group-hover:border-pink-400'
        }`}>
          {checked && <span className="text-white text-[10px] font-bold leading-none">✓</span>}
        </div>
        <span className={`text-xs transition-colors ${checked ? 'text-pink-300 font-medium' : 'text-gray-300 group-hover:text-gray-100'}`}>
          {label}
        </span>
      </label>
    );
  }

  return (
    <aside className="w-full lg:w-52 shrink-0 bg-gray-800 rounded-2xl p-4 space-y-4 text-sm self-start sticky top-4 shadow-card">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-gray-200 font-semibold">
          <SlidersHorizontal size={14} className="text-pink-400" />
          필터
        </div>
        <div className="flex items-center gap-1.5">
          {isFiltered && (
            <button
              onClick={resetFilter}
              className="flex items-center gap-1 text-xs text-pink-400 hover:text-pink-300 transition-colors"
            >
              <X size={11} /> 초기화
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden p-1 text-gray-400 hover:text-gray-200 transition-colors"
              title="닫기"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* 텍스트 검색 */}
      <div>
        <label className="text-xs text-gray-400 mb-1.5 block">내역 · 구매처 검색</label>
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-2 text-gray-500" />
          <input
            type="text"
            value={filter.searchText}
            onChange={(e) => setFilter({ searchText: e.target.value })}
            placeholder="검색어..."
            className="w-full pl-8 pr-2 py-1.5 bg-gray-700 border border-gray-600 rounded-xl text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-pink-500 transition-colors"
          />
        </div>
      </div>

      {/* 구분선 */}
      <div className="border-t border-gray-700" />

      {/* 사용목적 */}
      <div>
        <label className="text-xs font-semibold text-gray-300 mb-2 block uppercase tracking-wide">사용목적</label>
        <div className="flex flex-col gap-2">
          {PURPOSES.map((p) => (
            <FilterCheck
              key={p}
              label={`${getPurposeEmoji(p)} ${p}`}
              checked={filter.purposes.includes(p)}
              onChange={() => setFilter({ purposes: toggleArray(filter.purposes, p) })}
            />
          ))}
        </div>
      </div>

      <div className="border-t border-gray-700" />

      {/* 지출방법 */}
      <div>
        <label className="text-xs font-semibold text-gray-300 mb-2 block uppercase tracking-wide">지출방법</label>
        <div className="flex flex-col gap-2">
          {METHODS.map((m) => (
            <FilterCheck
              key={m}
              label={`${getPaymentEmoji(m)} ${m}`}
              checked={filter.paymentMethods.includes(m)}
              onChange={() => setFilter({ paymentMethods: toggleArray(filter.paymentMethods, m) })}
            />
          ))}
        </div>
      </div>

      {/* 지출한 사람 */}
      {persons.length >= 2 && (
        <>
          <div className="border-t border-gray-700" />
          <div>
            <label className="text-xs font-semibold text-gray-300 mb-2 block uppercase tracking-wide">지출한 사람</label>
            <div className="flex flex-col gap-2">
              {persons.map((p) => (
                <FilterCheck
                  key={p.id}
                  label={p.name}
                  checked={filter.persons.includes(p.name)}
                  onChange={() => setFilter({ persons: toggleArray(filter.persons, p.name) })}
                />
              ))}
            </div>
          </div>
        </>
      )}

      <div className="border-t border-gray-700" />

      {/* 카테고리 */}
      <div>
        <label className="text-xs font-semibold text-gray-300 mb-2 block uppercase tracking-wide">카테고리</label>
        <div className="flex flex-col gap-2 max-h-44 overflow-y-auto pr-1 scrollbar-thin">
          {[...categories].sort((a, b) => a.name.localeCompare(b.name, 'ko')).map((c) => (
            <FilterCheck
              key={c.id}
              label={c.name}
              checked={filter.categories.includes(c.name)}
              onChange={() => setFilter({ categories: toggleArray(filter.categories, c.name) })}
            />
          ))}
        </div>
      </div>

      <div className="border-t border-gray-700" />

      {/* 금액 범위 */}
      <div>
        <label className="text-xs font-semibold text-gray-300 mb-2 block uppercase tracking-wide">금액 범위</label>
        <div className="flex flex-col gap-1.5">
          <input
            type="text"
            value={filter.amountMin !== null ? filter.amountMin.toLocaleString('ko-KR') : ''}
            onChange={(e) => setFilter({ amountMin: e.target.value ? parseAmount(e.target.value) : null })}
            placeholder="최소 금액"
            className="w-full px-2.5 py-1.5 bg-gray-700 border border-gray-600 rounded-xl text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-pink-500 text-right transition-colors"
          />
          <input
            type="text"
            value={filter.amountMax !== null ? filter.amountMax.toLocaleString('ko-KR') : ''}
            onChange={(e) => setFilter({ amountMax: e.target.value ? parseAmount(e.target.value) : null })}
            placeholder="최대 금액"
            className="w-full px-2.5 py-1.5 bg-gray-700 border border-gray-600 rounded-xl text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-pink-500 text-right transition-colors"
          />
        </div>
      </div>

      {/* 필터 적용 상태 표시 */}
      {isFiltered && (
        <div className="bg-pink-900/40 border border-pink-700/50 rounded-xl py-2 text-center">
          <span className="text-xs text-pink-300">✨ 필터 적용 중</span>
        </div>
      )}
    </aside>
  );
}
