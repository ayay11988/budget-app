// ===================================================
// 새 지출 추가 입력 폼
// ===================================================

'use client';

import { useState, useRef } from 'react';
import { useBudgetStore } from '@/lib/store';
import { categorizeExpense } from '@/lib/claude';
import {
  formatAmountInput, parseAmount, getTodayFormatted,
  getPurposeEmoji, getPaymentEmoji, generateId, getCurrentYearMonth,
} from '@/lib/utils';
import { Purpose, PaymentMethod, Expense } from '@/lib/types';
import { PlusCircle, Sparkles, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const PURPOSES: Purpose[] = ['생활용', '사업용', '개인용'];
const METHODS: PaymentMethod[] = ['현금', '체크카드', '신용카드', '계좌이체', '기타'];

interface Props {
  onClose?: () => void;  // 모달 모드에서 닫기
}

export default function AddExpenseRow({ onClose }: Props) {
  const { addExpense, categories, persons } = useBudgetStore();
  const { year, month } = getCurrentYearMonth();

  const today = getTodayFormatted();
  const todayMatch = today.match(/(\d+)월\s*(\d+)일/);
  const todayDay = todayMatch ? parseInt(todayMatch[2], 10) : 1;

  const [form, setForm] = useState({
    purpose: '생활용' as Purpose,
    date: today,
    year,
    month,
    day: todayDay,
    person: persons.length === 1 ? persons[0].name : '',
    item: '',
    place: '',
    amount: '',
    category: '',
    paymentMethod: '체크카드' as PaymentMethod,
    memo: '',
  });
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [categoryConfidence, setCategoryConfidence] = useState<number | null>(null);
  const [categoryReason, setCategoryReason] = useState('');
  const itemRef = useRef<HTMLInputElement>(null);

  // 날짜 입력 처리 (MM월 DD일 형식)
  function handleDateChange(value: string) {
    const match = value.match(/(\d{1,2})월\s*(\d{1,2})일/);
    if (match) {
      setForm((f) => ({
        ...f,
        date: value,
        month: parseInt(match[1], 10),
        day: parseInt(match[2], 10),
      }));
    } else {
      setForm((f) => ({ ...f, date: value }));
    }
  }

  // AI 카테고리 자동 분류
  async function handleAutoCategory() {
    if (!form.item && !form.place) {
      toast.error('내역 또는 구매처를 먼저 입력해주세요 🌷');
      return;
    }
    setIsAiLoading(true);
    try {
      const result = await categorizeExpense({
        item: form.item,
        place: form.place,
        amount: parseAmount(form.amount),
        purpose: form.purpose,
        categories,
      });
      if (result.category) {
        setForm((f) => ({
          ...f,
          category: result.category!,
          purpose: result.purpose ?? f.purpose,
        }));
        setCategoryConfidence(result.confidence);
        setCategoryReason(result.reason);
        toast.success('AI가 카테고리를 추천했어요 ✨');
      } else {
        toast('적합한 카테고리를 찾지 못했어요 🥺', { icon: '⚠️' });
      }
    } catch {
      toast.error('AI 분류에 실패했어요. 직접 선택해주세요!');
    } finally {
      setIsAiLoading(false);
    }
  }

  // 저장
  function handleSubmit() {
    if (!form.item) {
      toast.error('내역을 입력해주세요 🌷');
      itemRef.current?.focus();
      return;
    }
    const amount = parseAmount(form.amount);
    if (amount === 0) {
      toast.error('금액을 입력해주세요 💕');
      return;
    }

    const expense: Omit<Expense, 'id' | 'createdAt'> = {
      purpose: form.purpose,
      date: form.date || today,
      year: form.year,
      month: form.month,
      day: form.day,
      person: form.person || (persons[0]?.name ?? ''),
      item: form.item,
      place: form.place,
      amount,
      category: form.category,
      paymentMethod: form.paymentMethod,
      memo: form.memo,
      categoryConfidence: categoryConfidence ?? undefined,
      categoryReason: categoryReason || undefined,
    };

    addExpense(expense);
    toast.success('지출이 추가됐어요 🌸');

    // 폼 초기화 (날짜·사람·사용목적은 유지)
    setForm((f) => ({
      ...f,
      item: '',
      place: '',
      amount: '',
      category: '',
      memo: '',
    }));
    setCategoryConfidence(null);
    setCategoryReason('');
    itemRef.current?.focus();
    onClose?.();
  }

  // 현재 사용목적의 카테고리만 표시
  const filteredCategories = categories.filter((c) => c.purpose === form.purpose);

  return (
    <div className="bg-white rounded-2xl shadow-card p-4 space-y-3">
      <h3 className="text-base font-semibold text-pink-700">🌷 새 지출 추가</h3>

      {/* 1행: 사용목적 + 날짜 + 지출한사람 */}
      <div className="grid grid-cols-3 gap-2">
        {/* 사용목적 */}
        <div>
          <label className="text-xs text-gray-500 mb-1 block">사용목적</label>
          <select
            value={form.purpose}
            onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value as Purpose, category: '' }))}
            className="w-full border border-pink-200 rounded-xl px-2 py-1.5 text-sm focus:outline-none focus:border-pink-400"
          >
            {PURPOSES.map((p) => (
              <option key={p} value={p}>{getPurposeEmoji(p)} {p}</option>
            ))}
          </select>
        </div>

        {/* 날짜 */}
        <div>
          <label className="text-xs text-gray-500 mb-1 block">날짜</label>
          <input
            type="text"
            value={form.date}
            onChange={(e) => handleDateChange(e.target.value)}
            placeholder="05월 15일"
            className="w-full border border-pink-200 rounded-xl px-2 py-1.5 text-sm focus:outline-none focus:border-pink-400"
          />
        </div>

        {/* 지출한 사람 (2명 이상일 때만 표시) */}
        {persons.length !== 1 && (
          <div>
            <label className="text-xs text-gray-500 mb-1 block">지출한 사람</label>
            {persons.length === 0 ? (
              <input
                type="text"
                value={form.person}
                onChange={(e) => setForm((f) => ({ ...f, person: e.target.value }))}
                placeholder="이름 입력"
                className="w-full border border-pink-200 rounded-xl px-2 py-1.5 text-sm focus:outline-none focus:border-pink-400"
              />
            ) : (
              <select
                value={form.person}
                onChange={(e) => setForm((f) => ({ ...f, person: e.target.value }))}
                className="w-full border border-pink-200 rounded-xl px-2 py-1.5 text-sm focus:outline-none focus:border-pink-400"
              >
                <option value="">선택...</option>
                {persons.map((p) => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
              </select>
            )}
          </div>
        )}
      </div>

      {/* 2행: 내역 + 구매처 */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">내역 *</label>
          <input
            ref={itemRef}
            type="text"
            value={form.item}
            onChange={(e) => setForm((f) => ({ ...f, item: e.target.value }))}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="예: 마트 장보기"
            className="w-full border border-pink-200 rounded-xl px-2 py-1.5 text-sm focus:outline-none focus:border-pink-400"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">구매처</label>
          <input
            type="text"
            value={form.place}
            onChange={(e) => setForm((f) => ({ ...f, place: e.target.value }))}
            placeholder="예: 이마트"
            className="w-full border border-pink-200 rounded-xl px-2 py-1.5 text-sm focus:outline-none focus:border-pink-400"
          />
        </div>
      </div>

      {/* 3행: 금액 + 카테고리(AI) + 지출방법 */}
      <div className="grid grid-cols-3 gap-2">
        {/* 금액 */}
        <div>
          <label className="text-xs text-gray-500 mb-1 block">금액 (₩) *</label>
          <input
            type="text"
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: formatAmountInput(e.target.value) }))}
            placeholder="0"
            className="w-full border border-pink-200 rounded-xl px-2 py-1.5 text-sm text-right focus:outline-none focus:border-pink-400"
          />
        </div>

        {/* 카테고리 + AI 버튼 */}
        <div>
          <label className="text-xs text-gray-500 mb-1 flex items-center gap-1">
            카테고리
            <button
              onClick={handleAutoCategory}
              disabled={isAiLoading}
              className="ml-1 inline-flex items-center gap-0.5 text-purple-500 hover:text-purple-700 disabled:opacity-40"
              title="AI 자동 분류"
            >
              {isAiLoading
                ? <Loader2 size={12} className="spinner" />
                : <Sparkles size={12} />
              }
              <span className="text-xs">AI</span>
            </button>
          </label>
          <div className="relative">
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className={`w-full border rounded-xl px-2 py-1.5 text-sm focus:outline-none focus:border-pink-400 ${
                categoryConfidence !== null && categoryConfidence < 0.7
                  ? 'border-yellow-400 bg-yellow-50'
                  : 'border-pink-200'
              }`}
            >
              <option value="">선택...</option>
              {filteredCategories.map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
            {categoryConfidence !== null && categoryConfidence < 0.7 && (
              <span className="absolute right-6 top-1.5 text-yellow-500 tooltip-container">
                ⚠️
                <span className="tooltip-text">{categoryReason}</span>
              </span>
            )}
          </div>
        </div>

        {/* 지출방법 */}
        <div>
          <label className="text-xs text-gray-500 mb-1 block">지출방법</label>
          <select
            value={form.paymentMethod}
            onChange={(e) => setForm((f) => ({ ...f, paymentMethod: e.target.value as PaymentMethod }))}
            className="w-full border border-pink-200 rounded-xl px-2 py-1.5 text-sm focus:outline-none focus:border-pink-400"
          >
            {METHODS.map((m) => (
              <option key={m} value={m}>{getPaymentEmoji(m)} {m}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 4행: 메모 */}
      <div>
        <label className="text-xs text-gray-500 mb-1 block">기타 (메모)</label>
        <input
          type="text"
          value={form.memo}
          onChange={(e) => setForm((f) => ({ ...f, memo: e.target.value }))}
          placeholder="비용처리 여부, 메모 등 자유롭게"
          className="w-full border border-pink-200 rounded-xl px-2 py-1.5 text-sm focus:outline-none focus:border-pink-400"
        />
      </div>

      {/* 저장 버튼 */}
      <div className="flex justify-end gap-2 pt-1">
        {onClose && (
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            취소
          </button>
        )}
        <button
          onClick={handleSubmit}
          className="flex items-center gap-2 px-5 py-2 bg-pink-400 hover:bg-pink-500 text-white text-sm font-medium rounded-2xl transition-colors shadow-soft"
        >
          <PlusCircle size={16} />
          추가하기
        </button>
      </div>
    </div>
  );
}
