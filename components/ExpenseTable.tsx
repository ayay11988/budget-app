// ===================================================
// 엑셀 스타일 지출 표
// - 가로: 컬럼(사용목적·날짜·사람·내역·구매처·금액·종류·지불방법·기타)
// - 세로: 날짜별 행
// - 체크박스로 여러 행 선택 후 일괄 삭제 가능
// - 최하단에 인라인 입력 행 (엑셀처럼 직접 타이핑)
// - 클릭 한 번으로 셀 편집
// ===================================================

'use client';

import { useState } from 'react';
import { useBudgetStore, getMonthExpenses, applyFilter } from '@/lib/store';
import {
  formatAmount, formatAmountInput, parseAmount,
  getPurposeEmoji, getPaymentEmoji, getTodayFormatted, getCurrentYearMonth,
} from '@/lib/utils';
import { Expense, Purpose, PaymentMethod } from '@/lib/types';
import { Trash2, Check, X, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

const PURPOSES: Purpose[] = ['생활용', '사업용', '개인용'];
const METHODS: PaymentMethod[] = ['현금', '체크카드', '신용카드', '계좌이체', '기타'];

// 사용목적 × 홀짝 행 배경색 (짝수 행이 살짝 더 진함)
function rowBg(purpose: Purpose, isEven: boolean) {
  switch (purpose) {
    case '생활용': return isEven ? 'bg-pink-100/80 hover:bg-pink-200/60' : 'bg-pink-50/60 hover:bg-pink-100/50';
    case '사업용': return isEven ? 'bg-sky-100/80 hover:bg-sky-200/60'  : 'bg-sky-50/60 hover:bg-sky-100/50';
    case '개인용': return isEven ? 'bg-emerald-100/80 hover:bg-emerald-200/60' : 'bg-emerald-50/60 hover:bg-emerald-100/50';
  }
}
// 사용목적 뱃지 색상
function purposeBadge(purpose: Purpose) {
  switch (purpose) {
    case '생활용': return 'bg-pink-100 text-pink-700';
    case '사업용': return 'bg-sky-100 text-sky-700';
    case '개인용': return 'bg-emerald-100 text-emerald-700';
  }
}

// ── 빈 입력 폼 초기값 ───────────────────────────────
const EMPTY_FORM = () => {
  const today = getTodayFormatted();
  const m = today.match(/(\d+)월\s*(\d+)일/);
  const { year, month } = getCurrentYearMonth();
  return {
    purpose: '생활용' as Purpose,
    date: today,
    year,
    month: m ? parseInt(m[1], 10) : month,
    day: m ? parseInt(m[2], 10) : 1,
    person: '',
    item: '',
    place: '',
    amount: '',
    category: '',
    paymentMethod: '체크카드' as PaymentMethod,
    memo: '',
  };
};

export default function ExpenseTable() {
  const {
    expenses, categories, persons,
    selectedYear, selectedMonth, filter,
    addExpense, updateExpense, deleteExpense, deleteExpenses,
  } = useBudgetStore();

  // 현재 월 + 필터 적용
  const monthExpenses = getMonthExpenses(expenses, selectedYear, selectedMonth);
  const rows = applyFilter(monthExpenses, filter);

  // 인라인 편집 상태
  const [editCell, setEditCell] = useState<{ id: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // ── 체크박스 선택 상태 ────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);

  // 하단 추가 행 상태
  const [newRow, setNewRow] = useState(EMPTY_FORM());

  // 필터가 걸려 있는지 여부
  const isFiltered = Object.values(filter).some((v) =>
    Array.isArray(v) ? v.length > 0 : v !== '' && v !== null
  );

  // ── 체크박스 헬퍼 ────────────────────────────────
  const allChecked = rows.length > 0 && rows.every((r) => selectedIds.has(r.id));
  const someChecked = rows.some((r) => selectedIds.has(r.id));

  function toggleAll() {
    if (allChecked) {
      // 전체 해제
      setSelectedIds(new Set());
    } else {
      // 전체 선택 (현재 보이는 행만)
      setSelectedIds(new Set(rows.map((r) => r.id)));
    }
    setShowBulkConfirm(false);
  }

  function toggleRow(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setShowBulkConfirm(false);
  }

  // 일괄 삭제 실행
  function handleBulkDelete() {
    const ids = Array.from(selectedIds);
    deleteExpenses(ids);
    setSelectedIds(new Set());
    setShowBulkConfirm(false);
    toast.success(`${ids.length}개 삭제됐어요 🗑️`, { duration: 1500 });
  }

  // ── 셀 클릭 → 편집 시작 ─────────────────────────
  function startEdit(expense: Expense, field: string) {
    let v = '';
    switch (field) {
      case 'amount': v = expense.amount.toLocaleString('ko-KR'); break;
      default: v = String((expense as unknown as Record<string, unknown>)[field] ?? '');
    }
    setEditCell({ id: expense.id, field });
    setEditValue(v);
  }

  // ── 편집 저장 ────────────────────────────────────
  function saveEdit(expense: Expense) {
    if (!editCell) return;
    const { field } = editCell;
    let updates: Partial<Expense> = {};
    switch (field) {
      case 'amount':
        updates = { amount: parseAmount(editValue) }; break;
      case 'date': {
        const m = editValue.match(/(\d{1,2})월\s*(\d{1,2})일/);
        updates = m
          ? { date: editValue, month: parseInt(m[1], 10), day: parseInt(m[2], 10) }
          : { date: editValue };
        break;
      }
      default: updates = { [field]: editValue } as Partial<Expense>;
    }
    updateExpense(expense.id, updates);
    setEditCell(null);
    toast.success('수정됐어요 💕', { duration: 1200 });
  }

  // ── 새 행 추가 ──────────────────────────────────
  function handleAddRow() {
    if (!newRow.item && !newRow.amount) {
      toast.error('내역 또는 금액을 입력해주세요 🌷');
      return;
    }
    addExpense({
      purpose: newRow.purpose,
      date: newRow.date,
      year: newRow.year,
      month: newRow.month,
      day: newRow.day,
      person: newRow.person || (persons.length === 1 ? persons[0].name : ''),
      item: newRow.item,
      place: newRow.place,
      amount: parseAmount(newRow.amount),
      category: newRow.category,
      paymentMethod: newRow.paymentMethod,
      memo: newRow.memo,
    });
    toast.success('추가됐어요 🌸', { duration: 1200 });
    setNewRow(EMPTY_FORM());
  }

  // 날짜 파싱 헬퍼
  function parseDateInput(value: string) {
    const m = value.match(/(\d{1,2})월\s*(\d{1,2})일/);
    return m
      ? { month: parseInt(m[1], 10), day: parseInt(m[2], 10) }
      : { month: newRow.month, day: newRow.day };
  }

  // 현재 사용목적에 맞는 카테고리
  const editingExpense = rows.find((r) => r.id === editCell?.id);
  const filteredCats = (purpose: Purpose) =>
    categories.filter((c) => c.purpose === purpose);

  // 헤더 총 컬럼 수 (체크박스 + 사용목적 + 날짜 + (사람) + 내역 + 구매처 + 금액 + 종류 + 지불방법 + 기타 + 삭제)
  const colSpanTotal = persons.length !== 1 ? 11 : 10;

  // ── 셀 렌더: 보기 vs 편집 ────────────────────────
  function Cell({
    expense, field, className = '',
  }: { expense: Expense; field: string; className?: string }) {
    const isEditing = editCell?.id === expense.id && editCell.field === field;

    if (!isEditing) {
      let display: React.ReactNode;
      switch (field) {
        case 'purpose':
          display = (
            <span className={`text-[11px] px-1.5 py-0.5 rounded-md font-medium whitespace-nowrap ${purposeBadge(expense.purpose)}`}>
              {getPurposeEmoji(expense.purpose)} {expense.purpose}
            </span>
          );
          break;
        case 'amount':
          display = (
            <span className={`font-medium tabular-nums ${expense.amount >= 100000 ? 'text-rose-600' : ''}`}>
              {formatAmount(expense.amount)}
            </span>
          );
          break;
        case 'paymentMethod':
          display = <span>{getPaymentEmoji(expense.paymentMethod)} {expense.paymentMethod}</span>;
          break;
        case 'category':
          display = (
            <span>
              {expense.category || <span className="text-gray-300">-</span>}
              {(expense.categoryConfidence ?? 1) < 0.7 && (
                <span className="ml-1 tooltip-container text-yellow-400 cursor-help">
                  ⚠️
                  <span className="tooltip-text">{expense.categoryReason}</span>
                </span>
              )}
            </span>
          );
          break;
        default:
          display = String((expense as unknown as Record<string, unknown>)[field] ?? '') || <span className="text-gray-200">-</span>;
      }
      return (
        <td
          className={`border border-gray-200 px-2 py-1 text-xs cursor-pointer ${className}`}
          onClick={() => startEdit(expense, field)}
        >
          {display}
        </td>
      );
    }

    // 편집 중인 셀
    const inputCls = 'w-full border-0 outline-none bg-white text-xs px-0 py-0 focus:ring-1 focus:ring-pink-300 rounded';

    let input: React.ReactNode;
    if (field === 'purpose') {
      input = (
        <select autoFocus value={editValue} onChange={(e) => setEditValue(e.target.value)}
          onBlur={() => saveEdit(expense)}
          onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(expense); if (e.key === 'Escape') setEditCell(null); }}
          className={inputCls}>
          {PURPOSES.map((p) => <option key={p} value={p}>{getPurposeEmoji(p)} {p}</option>)}
        </select>
      );
    } else if (field === 'paymentMethod') {
      input = (
        <select autoFocus value={editValue} onChange={(e) => setEditValue(e.target.value)}
          onBlur={() => saveEdit(expense)}
          onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(expense); if (e.key === 'Escape') setEditCell(null); }}
          className={inputCls}>
          {METHODS.map((m) => <option key={m} value={m}>{getPaymentEmoji(m)} {m}</option>)}
        </select>
      );
    } else if (field === 'category') {
      input = (
        <select autoFocus value={editValue} onChange={(e) => setEditValue(e.target.value)}
          onBlur={() => saveEdit(expense)}
          onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(expense); if (e.key === 'Escape') setEditCell(null); }}
          className={inputCls}>
          <option value="">-</option>
          {filteredCats(editingExpense?.purpose ?? '생활용').map((c) => (
            <option key={c.id} value={c.name}>{c.name}</option>
          ))}
        </select>
      );
    } else if (field === 'person' && persons.length > 1) {
      input = (
        <select autoFocus value={editValue} onChange={(e) => setEditValue(e.target.value)}
          onBlur={() => saveEdit(expense)}
          onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(expense); if (e.key === 'Escape') setEditCell(null); }}
          className={inputCls}>
          {persons.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
        </select>
      );
    } else {
      input = (
        <input autoFocus type="text" value={editValue}
          onChange={(e) => setEditValue(field === 'amount' ? formatAmountInput(e.target.value) : e.target.value)}
          onBlur={() => saveEdit(expense)}
          onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(expense); if (e.key === 'Escape') setEditCell(null); }}
          className={`${inputCls} ${field === 'amount' ? 'text-right' : ''}`}
        />
      );
    }

    return (
      <td className={`border border-pink-300 bg-white px-2 py-1 text-xs ${className}`}>
        {input}
      </td>
    );
  }

  return (
    <div>
      {/* ── 일괄 삭제 툴바 (선택 항목이 있을 때만 표시) ── */}
      {someChecked && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-red-50 border-b border-red-200">
          <span className="text-sm font-medium text-red-700">
            {selectedIds.size}개 선택됨
          </span>
          <span className="text-gray-300">|</span>
          {!showBulkConfirm ? (
            <button
              onClick={() => setShowBulkConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-xs font-medium rounded-lg transition-colors"
            >
              <Trash2 size={13} />
              선택 삭제
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-600 font-medium">정말 삭제할까요?</span>
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-1 px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-xs font-medium rounded-lg transition-colors"
              >
                <Check size={12} /> 삭제
              </button>
              <button
                onClick={() => setShowBulkConfirm(false)}
                className="flex items-center gap-1 px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-600 text-xs font-medium rounded-lg transition-colors"
              >
                <X size={12} /> 취소
              </button>
            </div>
          )}
          <button
            onClick={() => { setSelectedIds(new Set()); setShowBulkConfirm(false); }}
            className="ml-auto text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            선택 해제
          </button>
        </div>
      )}

      {/* 필터 결과 안내 */}
      {isFiltered && (
        <div className="px-3 py-1.5 bg-yellow-50 border-b border-yellow-100 text-xs text-yellow-700 flex gap-2">
          <span>🔍 필터 결과:</span>
          <span className="font-semibold">{formatAmount(rows.reduce((s, e) => s + e.amount, 0))}</span>
          <span>({rows.length}건)</span>
        </div>
      )}

      <div className="table-wrapper">
        <table className="w-full border-collapse text-xs min-w-[900px]">

          {/* ── 헤더 ── */}
          <thead className="sticky top-0 z-10">
            <tr className="bg-gray-100 text-gray-600">
              {/* 전체 선택 체크박스 */}
              <th className="border border-gray-300 px-2 py-2 w-[36px] text-center">
                <div
                  onClick={toggleAll}
                  className={`w-4 h-4 rounded border-2 cursor-pointer mx-auto flex items-center justify-center transition-colors ${
                    allChecked
                      ? 'bg-red-400 border-red-400'
                      : someChecked
                        ? 'bg-red-200 border-red-400'
                        : 'border-gray-400 hover:border-red-400 bg-white'
                  }`}
                >
                  {allChecked && <Check size={10} className="text-white" strokeWidth={3} />}
                  {!allChecked && someChecked && <span className="block w-2 h-0.5 bg-red-500 rounded" />}
                </div>
              </th>
              <th className="border border-gray-300 px-2 py-2 text-left font-semibold whitespace-nowrap w-[90px]">사용목적</th>
              <th className="border border-gray-300 px-2 py-2 text-left font-semibold whitespace-nowrap w-[80px]">날짜</th>
              {persons.length !== 1 && (
                <th className="border border-gray-300 px-2 py-2 text-left font-semibold whitespace-nowrap w-[70px]">지출한 사람</th>
              )}
              <th className="border border-gray-300 px-2 py-2 text-left font-semibold w-[160px]">내역</th>
              <th className="border border-gray-300 px-2 py-2 text-left font-semibold w-[100px]">구매처</th>
              <th className="border border-gray-300 px-2 py-2 text-right font-semibold w-[90px]">금액</th>
              <th className="border border-gray-300 px-2 py-2 text-left font-semibold w-[90px]">종류</th>
              <th className="border border-gray-300 px-2 py-2 text-left font-semibold whitespace-nowrap w-[90px]">지불방법</th>
              <th className="border border-gray-300 px-2 py-2 text-left font-semibold">기타</th>
              <th className="border border-gray-300 w-[36px]"></th>
            </tr>
          </thead>

          <tbody>
            {/* ── 데이터 행 ── */}
            {rows.length === 0 && (
              <tr>
                <td colSpan={colSpanTotal} className="border border-gray-100 py-16 text-center text-gray-400">
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-4xl">🌷</span>
                    <span>이번 달 지출이 없어요. 아래에서 직접 입력하거나 영수증을 올려주세요 💕</span>
                  </div>
                </td>
              </tr>
            )}

            {rows.map((expense, idx) => {
              const isChecked = selectedIds.has(expense.id);
              return (
                <tr
                  key={expense.id}
                  className={`group transition-colors ${
                    isChecked
                      ? 'bg-red-50 border-l-2 border-l-red-300'
                      : rowBg(expense.purpose, idx % 2 === 0)
                  }`}
                >
                  {/* 체크박스 셀 */}
                  <td className="border border-gray-200 px-2 py-1 text-center">
                    <div
                      onClick={() => toggleRow(expense.id)}
                      className={`w-4 h-4 rounded border-2 cursor-pointer mx-auto flex items-center justify-center transition-colors ${
                        isChecked
                          ? 'bg-red-400 border-red-400'
                          : 'border-gray-300 hover:border-red-400 bg-white group-hover:border-gray-400'
                      }`}
                    >
                      {isChecked && <Check size={10} className="text-white" strokeWidth={3} />}
                    </div>
                  </td>

                  <Cell expense={expense} field="purpose" />
                  <Cell expense={expense} field="date" className="whitespace-nowrap" />
                  {persons.length !== 1 && <Cell expense={expense} field="person" />}
                  <Cell expense={expense} field="item" />
                  <Cell expense={expense} field="place" />
                  <Cell expense={expense} field="amount" className="text-right" />
                  <Cell expense={expense} field="category" />
                  <Cell expense={expense} field="paymentMethod" className="whitespace-nowrap" />
                  <Cell expense={expense} field="memo" className="text-gray-500" />

                  {/* 단일 삭제 버튼 */}
                  <td className="border border-gray-200 px-1 text-center">
                    {deleteId === expense.id ? (
                      <div className="flex gap-0.5 justify-center">
                        <button onClick={() => { deleteExpense(expense.id); setDeleteId(null); toast.success('삭제됐어요 🥺', { duration: 1200 }); }} className="text-red-500 hover:text-red-700 p-0.5"><Check size={12} /></button>
                        <button onClick={() => setDeleteId(null)} className="text-gray-400 hover:text-gray-600 p-0.5"><X size={12} /></button>
                      </div>
                    ) : (
                      <button onClick={() => setDeleteId(expense.id)} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all p-0.5">
                        <Trash2 size={12} />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}

            {/* ── 인라인 입력 행 (엑셀 최하단 빈 행) ── */}
            <tr className="bg-amber-50/60 border-t-2 border-dashed border-amber-200">
              {/* 체크박스 자리 (빈 칸) */}
              <td className="border border-amber-200" />
              {/* 사용목적 */}
              <td className="border border-amber-200 px-1 py-1">
                <select value={newRow.purpose}
                  onChange={(e) => setNewRow((f) => ({ ...f, purpose: e.target.value as Purpose, category: '' }))}
                  className="w-full text-[11px] bg-transparent outline-none cursor-pointer">
                  {PURPOSES.map((p) => <option key={p} value={p}>{getPurposeEmoji(p)} {p}</option>)}
                </select>
              </td>
              {/* 날짜 */}
              <td className="border border-amber-200 px-1 py-1">
                <input type="text" value={newRow.date}
                  onChange={(e) => {
                    const { month, day } = parseDateInput(e.target.value);
                    setNewRow((f) => ({ ...f, date: e.target.value, month, day }));
                  }}
                  placeholder="05월 15일"
                  className="w-full text-[11px] bg-transparent outline-none" />
              </td>
              {/* 지출한 사람 (1명이면 숨김) */}
              {persons.length !== 1 && (
                <td className="border border-amber-200 px-1 py-1">
                  {persons.length === 0 ? (
                    <input type="text" value={newRow.person}
                      onChange={(e) => setNewRow((f) => ({ ...f, person: e.target.value }))}
                      placeholder="이름"
                      className="w-full text-[11px] bg-transparent outline-none" />
                  ) : (
                    <select value={newRow.person}
                      onChange={(e) => setNewRow((f) => ({ ...f, person: e.target.value }))}
                      className="w-full text-[11px] bg-transparent outline-none cursor-pointer">
                      <option value="">선택</option>
                      {persons.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
                    </select>
                  )}
                </td>
              )}
              {/* 내역 */}
              <td className="border border-amber-200 px-1 py-1">
                <input type="text" value={newRow.item}
                  onChange={(e) => setNewRow((f) => ({ ...f, item: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddRow(); }}
                  placeholder="내역 입력..."
                  className="w-full text-[11px] bg-transparent outline-none" />
              </td>
              {/* 구매처 */}
              <td className="border border-amber-200 px-1 py-1">
                <input type="text" value={newRow.place}
                  onChange={(e) => setNewRow((f) => ({ ...f, place: e.target.value }))}
                  placeholder="구매처"
                  className="w-full text-[11px] bg-transparent outline-none" />
              </td>
              {/* 금액 */}
              <td className="border border-amber-200 px-1 py-1">
                <input type="text" value={newRow.amount}
                  onChange={(e) => setNewRow((f) => ({ ...f, amount: formatAmountInput(e.target.value) }))}
                  placeholder="0"
                  className="w-full text-[11px] bg-transparent outline-none text-right" />
              </td>
              {/* 종류 */}
              <td className="border border-amber-200 px-1 py-1">
                <select value={newRow.category}
                  onChange={(e) => setNewRow((f) => ({ ...f, category: e.target.value }))}
                  className="w-full text-[11px] bg-transparent outline-none cursor-pointer">
                  <option value="">-</option>
                  {filteredCats(newRow.purpose).map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </td>
              {/* 지불방법 */}
              <td className="border border-amber-200 px-1 py-1">
                <select value={newRow.paymentMethod}
                  onChange={(e) => setNewRow((f) => ({ ...f, paymentMethod: e.target.value as PaymentMethod }))}
                  className="w-full text-[11px] bg-transparent outline-none cursor-pointer">
                  {METHODS.map((m) => <option key={m} value={m}>{getPaymentEmoji(m)} {m}</option>)}
                </select>
              </td>
              {/* 기타 */}
              <td className="border border-amber-200 px-1 py-1">
                <input type="text" value={newRow.memo}
                  onChange={(e) => setNewRow((f) => ({ ...f, memo: e.target.value }))}
                  placeholder="메모"
                  className="w-full text-[11px] bg-transparent outline-none" />
              </td>
              {/* 추가 버튼 */}
              <td className="border border-amber-200 px-1 text-center">
                <button onClick={handleAddRow}
                  className="p-1 text-amber-500 hover:text-amber-700 hover:bg-amber-100 rounded transition-colors"
                  title="추가 (Enter)">
                  <Plus size={14} />
                </button>
              </td>
            </tr>

            {/* ── 합계 행 ── */}
            {rows.length > 0 && (
              <tr className="bg-gray-50 font-semibold">
                <td className="border border-gray-300 px-2 py-1.5 text-xs text-gray-400 text-center">
                  {/* 합계 행의 체크박스 자리 */}
                </td>
                <td className="border border-gray-300 px-2 py-1.5 text-xs text-gray-500" colSpan={persons.length !== 1 ? 4 : 3}>
                  합계 ({rows.length}건)
                </td>
                <td className="border border-gray-300 px-2 py-1.5 text-xs text-right text-pink-700 font-bold">
                  {formatAmount(rows.reduce((s, e) => s + e.amount, 0))}
                </td>
                <td className="border border-gray-300" colSpan={4} />
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 안내 */}
      <p className="text-[11px] text-gray-300 px-3 py-1.5">
        💡 셀 클릭으로 수정 · 체크박스로 선택 후 일괄 삭제 · 아래 노란 행에서 직접 입력 · 📸 영수증 버튼으로 AI 자동 입력
      </p>
    </div>
  );
}
