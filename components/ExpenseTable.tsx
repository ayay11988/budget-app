// ===================================================
// 메인 지출 목록 테이블
// 인라인 편집, 행 hover 삭제, AI 신뢰도 경고 표시
// ===================================================

'use client';

import { useState } from 'react';
import { useBudgetStore, getMonthExpenses, applyFilter } from '@/lib/store';
import {
  formatAmount, formatAmountInput, parseAmount,
  getPurposeColorClass, getPurposeEmoji, getPaymentEmoji,
} from '@/lib/utils';
import { Expense, Purpose, PaymentMethod } from '@/lib/types';
import { Pencil, Trash2, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';

const PURPOSES: Purpose[] = ['생활용', '사업용', '개인용'];
const METHODS: PaymentMethod[] = ['현금', '체크카드', '신용카드', '계좌이체', '기타'];

interface EditState {
  field: string;
  value: string;
}

export default function ExpenseTable() {
  const { expenses, categories, persons, selectedYear, selectedMonth, filter, updateExpense, deleteExpense } = useBudgetStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>({ field: '', value: '' });
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // 현재 월 지출 + 필터 적용
  const monthExpenses = getMonthExpenses(expenses, selectedYear, selectedMonth);
  const filtered = applyFilter(monthExpenses, filter);

  // 인라인 편집 시작
  function startEdit(expense: Expense, field: string) {
    setEditingId(expense.id);
    let value: string;
    switch (field) {
      case 'amount': value = expense.amount.toLocaleString('ko-KR'); break;
      default: value = String((expense as unknown as Record<string, unknown>)[field] ?? '');
    }
    setEditState({ field, value });
  }

  // 인라인 편집 저장
  function saveEdit(expense: Expense) {
    const { field, value } = editState;
    let updates: Partial<Expense> = {};

    switch (field) {
      case 'amount':
        updates = { amount: parseAmount(value) };
        break;
      case 'date': {
        const match = value.match(/(\d{1,2})월\s*(\d{1,2})일/);
        if (match) {
          updates = {
            date: value,
            month: parseInt(match[1], 10),
            day: parseInt(match[2], 10),
          };
        } else {
          updates = { date: value };
        }
        break;
      }
      default:
        updates = { [field]: value } as Partial<Expense>;
    }

    updateExpense(expense.id, updates);
    setEditingId(null);
    toast.success('수정됐어요 💕');
  }

  // 삭제 확인
  function confirmDelete(id: string) {
    deleteExpense(id);
    setDeleteConfirmId(null);
    toast.success('삭제됐어요 🥺');
  }

  // 편집 중인 셀 렌더링
  function renderEditCell(expense: Expense, field: string) {
    const isEditing = editingId === expense.id && editState.field === field;

    if (!isEditing) {
      return (
        <span
          onDoubleClick={() => startEdit(expense, field)}
          className="cursor-text w-full block"
          title="더블클릭으로 편집"
        >
          {renderCellValue(expense, field)}
        </span>
      );
    }

    // 드롭다운 편집
    if (field === 'purpose') {
      return (
        <select
          autoFocus
          value={editState.value}
          onChange={(e) => setEditState({ field, value: e.target.value })}
          onBlur={() => saveEdit(expense)}
          onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(expense); if (e.key === 'Escape') setEditingId(null); }}
          className="w-full text-xs border border-pink-300 rounded px-1 py-0.5"
        >
          {PURPOSES.map((p) => <option key={p} value={p}>{getPurposeEmoji(p)} {p}</option>)}
        </select>
      );
    }
    if (field === 'paymentMethod') {
      return (
        <select
          autoFocus
          value={editState.value}
          onChange={(e) => setEditState({ field, value: e.target.value })}
          onBlur={() => saveEdit(expense)}
          onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(expense); if (e.key === 'Escape') setEditingId(null); }}
          className="w-full text-xs border border-pink-300 rounded px-1 py-0.5"
        >
          {METHODS.map((m) => <option key={m} value={m}>{getPaymentEmoji(m)} {m}</option>)}
        </select>
      );
    }
    if (field === 'category') {
      const filteredCats = categories.filter((c) => c.purpose === expense.purpose);
      return (
        <select
          autoFocus
          value={editState.value}
          onChange={(e) => setEditState({ field, value: e.target.value })}
          onBlur={() => saveEdit(expense)}
          onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(expense); if (e.key === 'Escape') setEditingId(null); }}
          className="w-full text-xs border border-pink-300 rounded px-1 py-0.5"
        >
          <option value="">선택...</option>
          {filteredCats.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>
      );
    }
    if (field === 'person') {
      return persons.length > 1 ? (
        <select
          autoFocus
          value={editState.value}
          onChange={(e) => setEditState({ field, value: e.target.value })}
          onBlur={() => saveEdit(expense)}
          onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(expense); if (e.key === 'Escape') setEditingId(null); }}
          className="w-full text-xs border border-pink-300 rounded px-1 py-0.5"
        >
          {persons.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
        </select>
      ) : (
        <input
          autoFocus
          type="text"
          value={editState.value}
          onChange={(e) => setEditState({ field, value: e.target.value })}
          onBlur={() => saveEdit(expense)}
          onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(expense); if (e.key === 'Escape') setEditingId(null); }}
          className="w-full text-xs border border-pink-300 rounded px-1 py-0.5"
        />
      );
    }

    // 일반 텍스트/숫자 입력
    return (
      <input
        autoFocus
        type="text"
        value={editState.value}
        onChange={(e) => {
          const v = field === 'amount' ? formatAmountInput(e.target.value) : e.target.value;
          setEditState({ field, value: v });
        }}
        onBlur={() => saveEdit(expense)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') saveEdit(expense);
          if (e.key === 'Escape') setEditingId(null);
        }}
        className={`w-full text-xs border border-pink-300 rounded px-1 py-0.5 ${field === 'amount' ? 'text-right' : ''}`}
      />
    );
  }

  // 셀 표시값 렌더링
  function renderCellValue(expense: Expense, field: string): React.ReactNode {
    switch (field) {
      case 'purpose':
        return (
          <span className={`text-xs px-1.5 py-0.5 rounded-lg font-medium ${getPurposeColorClass(expense.purpose)}`}>
            {getPurposeEmoji(expense.purpose)} {expense.purpose}
          </span>
        );
      case 'amount':
        return (
          <span className={`amount-cell font-medium ${expense.amount >= 100000 ? 'amount-large' : 'text-gray-700'}`}>
            {formatAmount(expense.amount)}
          </span>
        );
      case 'paymentMethod':
        return `${getPaymentEmoji(expense.paymentMethod)} ${expense.paymentMethod}`;
      case 'category':
        return (
          <span className="tooltip-container">
            {expense.category || <span className="text-gray-300">-</span>}
            {expense.categoryConfidence !== undefined && expense.categoryConfidence < 0.7 && (
              <> <span className="text-yellow-500">⚠️</span>
                <span className="tooltip-text">{expense.categoryReason}</span>
              </>
            )}
          </span>
        );
      default:
        return String((expense as unknown as Record<string, unknown>)[field] ?? '') || <span className="text-gray-300">-</span>;
    }
  }

  // 빈 상태
  if (monthExpenses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center fade-in">
        <div className="text-6xl mb-4">🌷</div>
        <p className="text-lg font-medium text-gray-500 mb-2">이번 달 지출이 없어요</p>
        <p className="text-sm text-gray-400">첫 지출을 기록해보세요 💕</p>
      </div>
    );
  }

  return (
    <div className="fade-in">
      {/* 필터 적용 결과 안내 */}
      {Object.values(filter).some((v) => Array.isArray(v) ? v.length > 0 : v !== '' && v !== null) && (
        <div className="px-4 py-2 bg-yellow-50 border-b border-yellow-100 text-sm text-yellow-700 flex items-center gap-2">
          <span>🔍 필터링된 결과:</span>
          <span className="font-semibold">{formatAmount(filtered.reduce((s, e) => s + e.amount, 0))}</span>
          <span className="text-yellow-500">({filtered.length}건)</span>
        </div>
      )}

      {/* 테이블 */}
      <div className="table-wrapper">
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr className="bg-pink-50 border-b border-pink-100">
              {['사용목적', '날짜', '지출한 사람', '내역', '구매처', '금액', '카테고리', '지출방법', '기타', ''].map((h) => (
                <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-pink-600 whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((expense, idx) => (
              <tr
                key={expense.id}
                className={`expense-row border-b border-pink-50 transition-colors hover:bg-pink-50/60 ${idx % 2 === 0 ? '' : 'bg-white/50'}`}
              >
                {/* 사용목적 */}
                <td className="px-3 py-2 editable-cell">{renderEditCell(expense, 'purpose')}</td>
                {/* 날짜 */}
                <td className="px-3 py-2 editable-cell whitespace-nowrap">{renderEditCell(expense, 'date')}</td>
                {/* 지출한 사람 */}
                <td className="px-3 py-2 editable-cell">{renderEditCell(expense, 'person')}</td>
                {/* 내역 */}
                <td className="px-3 py-2 editable-cell max-w-[160px]">{renderEditCell(expense, 'item')}</td>
                {/* 구매처 */}
                <td className="px-3 py-2 editable-cell max-w-[120px]">{renderEditCell(expense, 'place')}</td>
                {/* 금액 */}
                <td className="px-3 py-2 editable-cell text-right">{renderEditCell(expense, 'amount')}</td>
                {/* 카테고리 */}
                <td className="px-3 py-2 editable-cell">{renderEditCell(expense, 'category')}</td>
                {/* 지출방법 */}
                <td className="px-3 py-2 editable-cell whitespace-nowrap">{renderEditCell(expense, 'paymentMethod')}</td>
                {/* 기타 */}
                <td className="px-3 py-2 editable-cell max-w-[140px] text-gray-500 text-xs">{renderEditCell(expense, 'memo')}</td>

                {/* 수정/삭제 버튼 */}
                <td className="px-2 py-2">
                  <div className="row-actions flex items-center gap-1">
                    {deleteConfirmId === expense.id ? (
                      <>
                        <button onClick={() => confirmDelete(expense.id)} className="p-1 text-red-500 hover:text-red-700">
                          <Check size={14} />
                        </button>
                        <button onClick={() => setDeleteConfirmId(null)} className="p-1 text-gray-400 hover:text-gray-600">
                          <X size={14} />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirmId(expense.id)}
                        className="p-1 text-gray-300 hover:text-red-400 transition-colors"
                        title="삭제"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>

          {/* 합계 행 */}
          <tfoot>
            <tr className="bg-pink-50 border-t-2 border-pink-200">
              <td colSpan={5} className="px-3 py-2.5 text-xs font-semibold text-pink-600">
                합계 ({filtered.length}건)
              </td>
              <td className="px-3 py-2.5 text-right font-bold text-pink-700">
                {formatAmount(filtered.reduce((s, e) => s + e.amount, 0))}
              </td>
              <td colSpan={4} />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* 더블클릭 안내 */}
      <p className="text-xs text-gray-300 px-4 py-2">💡 셀을 더블클릭하면 바로 수정할 수 있어요</p>
    </div>
  );
}
