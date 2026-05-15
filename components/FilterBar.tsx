// ===================================================
// 필터/검색 사이드바
// ===================================================

'use client';

import { useBudgetStore } from '@/lib/store';
import { Purpose, PaymentMethod } from '@/lib/types';
import { getPurposeEmoji, getPaymentEmoji, formatAmountInput, parseAmount } from '@/lib/utils';
import { Search, X } from 'lucide-react';

const PURPOSES: Purpose[] = ['생활용', '사업용', '개인용'];
const METHODS: PaymentMethod[] = ['현금', '체크카드', '신용카드', '계좌이체', '기타'];

export default function FilterBar() {
  const { filter, setFilter, resetFilter, categories, persons } = useBudgetStore();

  // 필터가 적용됐는지 여부
  const isFiltered = filter.purposes.length > 0
    || filter.categories.length > 0
    || filter.persons.length > 0
    || filter.paymentMethods.length > 0
    || filter.dateFrom || filter.dateTo
    || filter.amountMin !== null || filter.amountMax !== null
    || filter.searchText;

  function toggleArray<T>(arr: T[], item: T): T[] {
    return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];
  }

  return (
    <aside className="w-56 shrink-0 bg-white rounded-2xl shadow-soft p-4 space-y-4 text-sm self-start sticky top-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-700">🔍 필터</h3>
        {isFiltered && (
          <button
            onClick={resetFilter}
            className="text-xs text-pink-400 hover:text-pink-600 flex items-center gap-0.5"
          >
            <X size={12} /> 초기화
          </button>
        )}
      </div>

      {/* 텍스트 검색 */}
      <div>
        <label className="text-xs text-gray-500 mb-1 block">내역/구매처 검색</label>
        <div className="relative">
          <Search size={14} className="absolute left-2 top-2 text-gray-300" />
          <input
            type="text"
            value={filter.searchText}
            onChange={(e) => setFilter({ searchText: e.target.value })}
            placeholder="검색어 입력"
            className="w-full pl-7 pr-2 py-1.5 border border-pink-100 rounded-xl text-xs focus:outline-none focus:border-pink-300"
          />
        </div>
      </div>

      {/* 사용목적 */}
      <div>
        <label className="text-xs font-medium text-gray-600 mb-2 block">사용목적</label>
        <div className="flex flex-col gap-1">
          {PURPOSES.map((p) => (
            <label key={p} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filter.purposes.includes(p)}
                onChange={() => setFilter({ purposes: toggleArray(filter.purposes, p) })}
                className="accent-pink-400 w-3.5 h-3.5"
              />
              <span className="text-xs text-gray-600">{getPurposeEmoji(p)} {p}</span>
            </label>
          ))}
        </div>
      </div>

      {/* 지출방법 */}
      <div>
        <label className="text-xs font-medium text-gray-600 mb-2 block">지출방법</label>
        <div className="flex flex-col gap-1">
          {METHODS.map((m) => (
            <label key={m} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filter.paymentMethods.includes(m)}
                onChange={() => setFilter({ paymentMethods: toggleArray(filter.paymentMethods, m) })}
                className="accent-pink-400 w-3.5 h-3.5"
              />
              <span className="text-xs text-gray-600">{getPaymentEmoji(m)} {m}</span>
            </label>
          ))}
        </div>
      </div>

      {/* 지출한 사람 (2명 이상일 때만 표시) */}
      {persons.length >= 2 && (
        <div>
          <label className="text-xs font-medium text-gray-600 mb-2 block">지출한 사람</label>
          <div className="flex flex-col gap-1">
            {persons.map((p) => (
              <label key={p.id} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filter.persons.includes(p.name)}
                  onChange={() => setFilter({ persons: toggleArray(filter.persons, p.name) })}
                  className="accent-pink-400 w-3.5 h-3.5"
                />
                <span className="text-xs text-gray-600">{p.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* 카테고리 */}
      <div>
        <label className="text-xs font-medium text-gray-600 mb-2 block">카테고리</label>
        <div className="flex flex-col gap-1 max-h-48 overflow-y-auto pr-1">
          {categories.map((c) => (
            <label key={c.id} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filter.categories.includes(c.name)}
                onChange={() => setFilter({ categories: toggleArray(filter.categories, c.name) })}
                className="accent-pink-400 w-3.5 h-3.5 shrink-0"
              />
              <span className="text-xs text-gray-600 truncate">{c.name}</span>
            </label>
          ))}
        </div>
      </div>

      {/* 금액 범위 */}
      <div>
        <label className="text-xs font-medium text-gray-600 mb-2 block">금액 범위 (₩)</label>
        <div className="flex flex-col gap-1.5">
          <input
            type="text"
            value={filter.amountMin !== null ? filter.amountMin.toLocaleString('ko-KR') : ''}
            onChange={(e) => setFilter({ amountMin: e.target.value ? parseAmount(e.target.value) : null })}
            placeholder="최소"
            className="w-full px-2 py-1.5 border border-pink-100 rounded-xl text-xs focus:outline-none focus:border-pink-300 text-right"
          />
          <input
            type="text"
            value={filter.amountMax !== null ? filter.amountMax.toLocaleString('ko-KR') : ''}
            onChange={(e) => setFilter({ amountMax: e.target.value ? parseAmount(e.target.value) : null })}
            placeholder="최대"
            className="w-full px-2 py-1.5 border border-pink-100 rounded-xl text-xs focus:outline-none focus:border-pink-300 text-right"
          />
        </div>
      </div>

      {/* 적용된 필터 표시 */}
      {isFiltered && (
        <div className="text-xs text-center text-pink-400 bg-pink-50 rounded-xl py-2">
          ✨ 필터가 적용됐어요
        </div>
      )}
    </aside>
  );
}
