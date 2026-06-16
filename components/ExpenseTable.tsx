// ===================================================
// 엑셀 스타일 지출 표
// - 클릭 → 셀 편집
// - 꾹 누른 채 다른 행으로 이동 → 다중 선택 + 합계 표시
// - 체크박스 → 일괄 삭제
// ===================================================

'use client';

import { useState, useRef, useEffect } from 'react';
import { useBudgetStore, getMonthExpenses, applyFilter } from '@/lib/store';
import {
  formatAmount, formatAmountInput, parseAmount,
  getPurposeEmoji, getPaymentEmoji, getTodayFormatted, getCurrentYearMonth,
} from '@/lib/utils';
import { Expense, Purpose, PaymentMethod, ReceiptDetail } from '@/lib/types';
import { Trash2, Check, X, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

const PURPOSES: Purpose[] = ['생활용', '사업용', '개인용'];
const METHODS: PaymentMethod[] = ['현금', '체크카드', '신용카드', '계좌이체', '기타'];

/** "(정산 N명 완료)" 패턴에서 N 추출 (완료 없으면 null) */
function parseSettlement(item: string): number | null {
  const match = item.match(/\(정산\s*(\d+)명\s*완료\)/);
  if (!match) return null;
  const n = parseInt(match[1], 10);
  return n > 1 ? n : null;
}

function rowBg(purpose: Purpose, isEven: boolean) {
  if (!isEven) return 'bg-white hover:bg-gray-50';
  switch (purpose) {
    case '생활용': return 'bg-yellow-100 hover:bg-yellow-200';
    case '사업용': return 'bg-sky-100 hover:bg-sky-200';
    case '개인용': return 'bg-pink-100 hover:bg-pink-200';
  }
}
function purposeBadge(purpose: Purpose) {
  switch (purpose) {
    case '생활용': return 'bg-yellow-200 text-yellow-800';
    case '사업용': return 'bg-sky-200 text-sky-800';
    case '개인용': return 'bg-pink-200 text-pink-800';
  }
}

const EMPTY_FORM = () => {
  const today = getTodayFormatted();
  const m = today.match(/(\d+)월\s*(\d+)일/);
  const { year, month } = getCurrentYearMonth();
  return {
    purpose: '생활용' as Purpose,
    date: today, year,
    month: m ? parseInt(m[1], 10) : month,
    day: m ? parseInt(m[2], 10) : 1,
    person: '', item: '', place: '', amount: '', category: '',
    paymentMethod: '체크카드' as PaymentMethod, memo: '',
  };
};

export default function ExpenseTable() {
  const {
    expenses, categories, persons,
    selectedYear, selectedMonth, filter,
    addExpense, updateExpense, deleteExpense, deleteExpenses,
  } = useBudgetStore();

  const monthExpenses = getMonthExpenses(expenses, selectedYear, selectedMonth);
  const rows = applyFilter(monthExpenses, filter);

  // ── 모바일 감지 ────────────────────────────────
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // ── 모바일용 모달 상태 ──────────────────────────
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingExpenseForModal, setEditingExpenseForModal] = useState<Expense | null>(null);

  function openAddModal() {
    setModalMode('add');
    setEditingExpenseForModal(null);
    setModalOpen(true);
  }

  function openEditModal(expense: Expense) {
    setModalMode('edit');
    setEditingExpenseForModal(expense);
    setModalOpen(true);
  }

  // ── 영수증 상세 모달 상태 ────────────────────────
  const [viewReceiptExpense, setViewReceiptExpense] = useState<Expense | null>(null);

  function openReceiptDetail(expense: Expense) {
    setViewReceiptExpense(expense);
  }

  // ── 셀 편집 상태 ────────────────────────────────
  const [editCell, setEditCell] = useState<{ id: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [newRow, setNewRow] = useState(EMPTY_FORM());

  // ── 체크박스 선택 (일괄 삭제용) ──────────────────
  const [checkIds, setCheckIds] = useState<Set<string>>(new Set());
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);

  // ── 드래그 선택 (합계 표시용) ────────────────────
  // ref 사용: 드래그 시작 행 인덱스 (state 아님 → 클릭에 영향 없음)
  const dragAnchorRef = useRef<number | null>(null);
  const [dragIds, setDragIds] = useState<Set<string>>(new Set());
  const [isDragging, setIsDragging] = useState(false);

  // 마우스 버튼 뗐을 때 드래그 종료
  useEffect(() => {
    const onMouseUp = () => {
      dragAnchorRef.current = null;
      if (isDragging) {
        setIsDragging(false);
        document.body.style.userSelect = '';
      }
    };
    window.addEventListener('mouseup', onMouseUp);
    return () => window.removeEventListener('mouseup', onMouseUp);
  }, [isDragging]);

  // 행 mousedown: anchor만 기록, preventDefault 안 함 → onClick 정상 동작
  function handleRowMouseDown(idx: number, e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest('input, select, button')) return;
    dragAnchorRef.current = idx;
  }

  // 행 mouseenter: 마우스 버튼 누른 채 다른 행 진입 → 드래그 모드
  function handleRowMouseEnter(idx: number, e: React.MouseEvent) {
    if (dragAnchorRef.current === null) return;
    if (e.buttons !== 1) { dragAnchorRef.current = null; return; }

    if (!isDragging) {
      setIsDragging(true);
      document.body.style.userSelect = 'none'; // 텍스트 선택 방지
    }
    const lo = Math.min(dragAnchorRef.current, idx);
    const hi = Math.max(dragAnchorRef.current, idx);
    setDragIds(new Set(rows.slice(lo, hi + 1).map((r) => r.id)));
  }

  // ── 체크박스 헬퍼 ────────────────────────────────
  const allChecked = rows.length > 0 && rows.every((r) => checkIds.has(r.id));
  const someChecked = rows.some((r) => checkIds.has(r.id));

  function toggleAll() {
    setCheckIds(allChecked ? new Set() : new Set(rows.map((r) => r.id)));
    setShowBulkConfirm(false);
  }
  function toggleCheck(id: string) {
    setCheckIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
    setShowBulkConfirm(false);
  }
  function handleBulkDelete() {
    const ids = Array.from(checkIds);
    deleteExpenses(ids);
    setCheckIds(new Set());
    setShowBulkConfirm(false);
    toast.success(`${ids.length}개 삭제됐어요 🗑️`, { duration: 1500 });
  }

  // ── 편집 시작 ────────────────────────────────────
  function startEdit(expense: Expense, field: string) {
    // 드래그 중이면 편집 무시
    if (isDragging) return;
    let v = '';
    switch (field) {
      case 'amount': v = expense.amount.toLocaleString('ko-KR'); break;
      default: v = String((expense as unknown as Record<string, unknown>)[field] ?? '');
    }
    setEditCell({ id: expense.id, field });
    setEditValue(v);
  }

  // ── 탭 이동 순서 (사용목적은 클릭 전환이므로 제외) ──
  function getTabFields() {
    const fields = ['date'];
    if (persons.length !== 1) fields.push('person');
    fields.push('item', 'place', 'amount', 'category', 'paymentMethod', 'memo');
    return fields;
  }

  // ── 편집 저장 (값을 직접 받음 → 한국어 IME 정상 동작) ──
  function saveEditValue(expense: Expense, rawValue: string, tabDir?: 1 | -1) {
    if (!editCell) return;
    const { field } = editCell;
    let updates: Partial<Expense> = {};
    switch (field) {
      case 'amount': updates = { amount: parseAmount(rawValue) }; break;
      case 'date': {
        const m = rawValue.match(/(\d{1,2})월\s*(\d{1,2})일/);
        updates = m
          ? { date: rawValue, month: parseInt(m[1], 10), day: parseInt(m[2], 10) }
          : { date: rawValue };
        break;
      }
      default: updates = { [field]: rawValue } as Partial<Expense>;
    }
    // ── 정산 자동 계산: "(정산 N명 완료)" 패턴 ──────
    const currentItem   = field === 'item'   ? rawValue           : expense.item;
    const currentAmount = field === 'amount' ? parseAmount(rawValue) : expense.amount;
    const settlementN   = parseSettlement(currentItem);
    if (settlementN && currentAmount > 0) {
      const myShare = Math.round(currentAmount / settlementN);
      updates = {
        ...updates,
        amount: myShare,
        memo: `실결제 ₩${currentAmount.toLocaleString('ko-KR')}`,
      };
      toast.success(`정산 완료 🧾 ${settlementN}명 → 내 몫 ₩${myShare.toLocaleString('ko-KR')}`, { duration: 2500 });
    } else {
      if (!tabDir) toast.success('수정됐어요 💕', { duration: 1200 });
    }

    updateExpense(expense.id, updates);
    setEditCell(null);

    // Tab 이동: 저장 후 다음/이전 셀로 포커스
    if (tabDir) {
      const fields = getTabFields();
      const idx = fields.indexOf(field);
      const nextIdx = idx + tabDir;
      if (nextIdx >= 0 && nextIdx < fields.length) {
        setTimeout(() => startEdit(expense, fields[nextIdx]), 0);
      }
    }
  }
  function saveEdit(expense: Expense) { saveEditValue(expense, editValue); }

  // select용 Tab 핸들러 (value가 이미 state에 있음)
  function handleSelectTab(e: React.KeyboardEvent, expense: Expense) {
    if (e.key !== 'Tab') return;
    e.preventDefault();
    saveEditValue(expense, editValue, e.shiftKey ? -1 : 1);
  }

  // ── 새 행 추가 ────────────────────────────────────
  function handleAddRow() {
    if (!newRow.item && !newRow.amount) { toast.error('내역 또는 금액을 입력해주세요 🌷'); return; }
    const rawAmount   = parseAmount(newRow.amount);
    const settlementN = parseSettlement(newRow.item);
    const finalAmount = settlementN && rawAmount > 0 ? Math.round(rawAmount / settlementN) : rawAmount;
    const finalMemo   = settlementN && rawAmount > 0
      ? `실결제 ₩${rawAmount.toLocaleString('ko-KR')}`
      : newRow.memo;
    addExpense({
      purpose: newRow.purpose, date: newRow.date, year: newRow.year,
      month: newRow.month, day: newRow.day,
      person: newRow.person || (persons.length === 1 ? persons[0].name : ''),
      item: newRow.item, place: newRow.place,
      amount: finalAmount,
      category: newRow.category, paymentMethod: newRow.paymentMethod, memo: finalMemo,
    });
    if (settlementN && rawAmount > 0) {
      toast.success(`정산 완료 🧾 ${settlementN}명 → 내 몫 ₩${finalAmount.toLocaleString('ko-KR')}`, { duration: 2500 });
    } else {
      toast.success('추가됐어요 🌸', { duration: 1200 });
    }
    setNewRow(EMPTY_FORM());
  }

  function parseDateInput(value: string) {
    const m = value.match(/(\d{1,2})월\s*(\d{1,2})일/);
    return m ? { month: parseInt(m[1], 10), day: parseInt(m[2], 10) } : { month: newRow.month, day: newRow.day };
  }

  const isFiltered = Object.values(filter).some((v) =>
    Array.isArray(v) ? v.length > 0 : v !== '' && v !== null
  );
  const editingExpense = rows.find((r) => r.id === editCell?.id);
  const filteredCats = (purpose: Purpose) =>
    categories.filter((c) => c.purpose === purpose).sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  const colSpanTotal = persons.length !== 1 ? 11 : 10;

  // ── 셀 렌더 ──────────────────────────────────────
  function Cell({ expense, field, className = '' }: { expense: Expense; field: string; className?: string }) {
    const isEditing = editCell?.id === expense.id && editCell.field === field;
    const inputCls = 'w-full border-0 outline-none bg-white text-xs px-0 py-0 focus:ring-1 focus:ring-pink-300 rounded';

    // 사용목적: 클릭할 때마다 생활용→사업용→개인용→생활용 순환
    if (field === 'purpose') {
      return (
        <td
          className={`border border-gray-200 px-2 py-1.5 text-xs cursor-pointer select-none ${className}`}
          title="클릭하면 변경돼요"
          onClick={() => {
            if (isDragging) return;
            const idx = PURPOSES.indexOf(expense.purpose);
            const next = PURPOSES[(idx + 1) % PURPOSES.length];
            updateExpense(expense.id, { purpose: next });
          }}
        >
          <span className={`text-[11px] px-1.5 py-0.5 rounded-md font-medium whitespace-nowrap ${purposeBadge(expense.purpose)}`}>
            {getPurposeEmoji(expense.purpose)} {expense.purpose}
          </span>
        </td>
      );
    }

    if (!isEditing) {
      let display: React.ReactNode;
      switch (field) {
        case 'purpose':
          display = null; // 위에서 이미 처리됨
          break;
        case 'item':
          display = (
            <span className="flex items-center gap-1.5">
              <span className="font-medium">{expense.item}</span>
              {expense.receiptDetails && expense.receiptDetails.length > 0 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openReceiptDetail(expense);
                  }}
                  className="px-1.5 py-0.5 bg-purple-50 hover:bg-purple-100 text-purple-600 border border-purple-200 rounded text-[9px] font-medium flex items-center gap-0.5 transition-colors shrink-0"
                  title="영수증 세부 내역 보기"
                >
                  🧾 영수증
                </button>
              )}
            </span>
          );
          break;
        case 'amount':
          display = <span className={`font-medium tabular-nums ${expense.amount >= 100000 ? 'text-rose-600' : ''}`}>{formatAmount(expense.amount)}</span>;
          break;
        case 'paymentMethod':
          display = <span>{getPaymentEmoji(expense.paymentMethod)} {expense.paymentMethod}</span>;
          break;
        case 'category':
          display = (
            <span>
              {expense.category || <span className="text-gray-300">-</span>}
              {(expense.categoryConfidence ?? 1) < 0.7 && (
                <span className="ml-1 tooltip-container text-yellow-400 cursor-help">⚠️<span className="tooltip-text">{expense.categoryReason}</span></span>
              )}
            </span>
          );
          break;
        default:
          display = String((expense as unknown as Record<string, unknown>)[field] ?? '') || <span className="text-gray-200">-</span>;
      }
      return (
        <td className={`border border-gray-200 px-2 py-1.5 text-xs cursor-pointer ${className}`} onClick={() => startEdit(expense, field)}>
          {display}
        </td>
      );
    }

    // 편집 중
    const selectKeyDown = (e: React.KeyboardEvent, exp: Expense) => {
      if (e.key === 'Tab') { e.preventDefault(); saveEditValue(exp, editValue, e.shiftKey ? -1 : 1); }
      else if (e.key === 'Enter') saveEdit(exp);
      else if (e.key === 'Escape') setEditCell(null);
    };

    let input: React.ReactNode;
    // select: onChange에서 즉시 저장 (onBlur 제거 → 드롭다운 닫힐 때 spurious blur 방지)
    if (field === 'purpose') {
      input = <select autoFocus value={editValue} onChange={(e) => saveEditValue(expense, e.target.value)} onKeyDown={(e) => selectKeyDown(e, expense)} className={inputCls}>{PURPOSES.map((p) => <option key={p} value={p}>{getPurposeEmoji(p)} {p}</option>)}</select>;
    } else if (field === 'paymentMethod') {
      input = <select autoFocus value={editValue} onChange={(e) => saveEditValue(expense, e.target.value)} onKeyDown={(e) => selectKeyDown(e, expense)} className={inputCls}>{METHODS.map((m) => <option key={m} value={m}>{getPaymentEmoji(m)} {m}</option>)}</select>;
    } else if (field === 'category') {
      input = <select autoFocus value={editValue} onChange={(e) => saveEditValue(expense, e.target.value)} onKeyDown={(e) => selectKeyDown(e, expense)} className={inputCls}><option value="">-</option>{filteredCats(editingExpense?.purpose ?? '생활용').map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}</select>;
    } else if (field === 'person' && persons.length > 1) {
      input = <select autoFocus value={editValue} onChange={(e) => saveEditValue(expense, e.target.value)} onKeyDown={(e) => selectKeyDown(e, expense)} className={inputCls}>{persons.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}</select>;
    } else {
      // defaultValue 사용 → 한국어 IME 조합이 끊기지 않음
      input = (
        <input
          autoFocus type="text"
          defaultValue={editValue}
          onBlur={(e) => saveEditValue(expense, field === 'amount' ? formatAmountInput(e.target.value) : e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Tab') {
              e.preventDefault();
              const val = field === 'amount'
                ? formatAmountInput((e.target as HTMLInputElement).value)
                : (e.target as HTMLInputElement).value;
              saveEditValue(expense, val, e.shiftKey ? -1 : 1);
              return;
            }
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
              saveEditValue(expense, field === 'amount' ? formatAmountInput((e.target as HTMLInputElement).value) : (e.target as HTMLInputElement).value);
            }
            if (e.key === 'Escape') setEditCell(null);
          }}
          className={`${inputCls} ${field === 'amount' ? 'text-right' : ''}`}
        />
      );
    }
    return <td className={`border border-pink-300 bg-white px-2 py-1 text-xs ${className}`}>{input}</td>;
  }

  // ── 드래그 선택 합계 계산 ──────────────────────────
  const dragSel = dragIds.size > 0 ? rows.filter((r) => dragIds.has(r.id)) : [];
  const dragSum = dragSel.reduce((s, r) => s + r.amount, 0);
  const dragAvg = dragSel.length > 0 ? Math.round(dragSum / dragSel.length) : 0;
  const dragMax = dragSel.length > 0 ? Math.max(...dragSel.map((r) => r.amount)) : 0;
  const dragMin = dragSel.length > 0 ? Math.min(...dragSel.map((r) => r.amount)) : 0;

  if (isMobile) {
    return (
      <div>
        {/* ── 일괄 삭제 툴바 ── */}
        {someChecked && (
          <div className="flex items-center gap-3 px-4 py-2.5 bg-red-50 border-b border-red-200">
            <span className="text-sm font-medium text-red-700">{checkIds.size}개 선택됨</span>
            <span className="text-gray-300">|</span>
            {!showBulkConfirm ? (
              <button onClick={() => setShowBulkConfirm(true)} className="flex items-center gap-1.5 px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-xs font-medium rounded-lg transition-colors"><Trash2 size={13} /> 선택 삭제</button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-600 font-medium">정말 삭제할까요?</span>
                <button onClick={handleBulkDelete} className="flex items-center gap-1 px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-xs font-medium rounded-lg transition-colors"><Check size={12} /> 삭제</button>
                <button onClick={() => setShowBulkConfirm(false)} className="flex items-center gap-1 px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-600 text-xs font-medium rounded-lg transition-colors"><X size={12} /> 취소</button>
              </div>
            )}
            <button onClick={() => { setCheckIds(new Set()); setShowBulkConfirm(false); }} className="ml-auto text-xs text-gray-400 hover:text-gray-600">선택 해제</button>
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

        {/* 지출 카드 리스트 */}
        {rows.length === 0 ? (
          <div className="border border-gray-100 py-16 text-center text-gray-400">
            <div className="flex flex-col items-center gap-2">
              <span className="text-4xl">🌷</span>
              <span className="text-sm px-4">이번 달 지출이 없어요. 아래 플러스 버튼이나 이미지로 추가해 주세요 💕</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-gray-100">
            {rows.map((expense) => {
              const isChecked = checkIds.has(expense.id);
              return (
                <div
                  key={expense.id}
                  onClick={() => openEditModal(expense)}
                  className={`p-3.5 flex items-center gap-3 active:bg-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer ${
                    isChecked ? 'bg-red-50/50' : ''
                  }`}
                >
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleCheck(expense.id);
                    }}
                    className="p-1.5 -ml-1.5"
                  >
                    <div
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                        isChecked ? 'bg-red-400 border-red-400 text-white' : 'border-gray-300 bg-white'
                      }`}
                    >
                      {isChecked && <Check size={12} strokeWidth={3} />}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap">
                        {expense.date}
                      </span>
                      {persons.length > 1 && expense.person && (
                        <span className="text-[10px] bg-gray-100 text-gray-500 px-1 py-0.5 rounded">
                          👤 {expense.person}
                        </span>
                      )}
                      <span className={`text-[9px] px-1 py-0.2 rounded-md font-medium whitespace-nowrap ${purposeBadge(expense.purpose)}`}>
                        {getPurposeEmoji(expense.purpose)} {expense.purpose}
                      </span>
                    </div>

                    <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                      <span className="truncate">{expense.item}</span>
                      {expense.receiptDetails && expense.receiptDetails.length > 0 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openReceiptDetail(expense);
                          }}
                          className="px-1.5 py-0.5 bg-purple-50 active:bg-purple-100 text-purple-600 border border-purple-200 rounded text-[9px] font-medium flex items-center gap-0.5 transition-colors shrink-0"
                        >
                          🧾 영수증
                        </button>
                      )}
                    </h4>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-500 flex-wrap">
                      {expense.place && <span className="truncate max-w-[120px]">📍 {expense.place}</span>}
                      {expense.category && (
                        <span className="bg-pink-50 text-pink-600 px-1.5 py-0.5 rounded-md text-[10px] font-medium">
                          🏷️ {expense.category}
                        </span>
                      )}
                      <span className="text-gray-400 text-[10px] whitespace-nowrap">
                        {getPaymentEmoji(expense.paymentMethod)} {expense.paymentMethod}
                      </span>
                    </div>
                    {expense.memo && (
                      <p className="text-[10px] text-gray-400 mt-1 italic truncate">
                        💬 {expense.memo}
                      </p>
                    )}
                  </div>

                  <div className="text-right shrink-0 pl-2">
                    <span className={`text-base font-bold tabular-nums ${
                      expense.amount >= 100000 ? 'text-rose-600' : 'text-gray-700'
                    }`}>
                      {formatAmount(expense.amount)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 합계 요약 */}
        {rows.length > 0 && (
          <div className="bg-gray-50 px-4 py-3 flex justify-between items-center font-semibold border-t border-gray-100">
            <span className="text-xs text-gray-500">합계 ({rows.length}건)</span>
            <span className="text-sm text-pink-700 font-bold">{formatAmount(rows.reduce((s, e) => s + e.amount, 0))}</span>
          </div>
        )}

        {/* 모바일 플로팅 수동 추가 버튼 (FAB) */}
        <button
          onClick={openAddModal}
          className="fixed bottom-6 right-6 w-14 h-14 bg-pink-500 hover:bg-pink-600 text-white rounded-full shadow-lg flex items-center justify-center transition-all transform active:scale-95 z-30"
          title="직접 추가"
        >
          <Plus size={24} />
        </button>

        {/* 모바일 지출 추가/수정 모달 */}
        {modalOpen && (
          <ExpenseFormModal
            mode={modalMode}
            expense={editingExpenseForModal}
            onClose={() => setModalOpen(false)}
            categories={categories}
            persons={persons}
            addExpense={addExpense}
            updateExpense={updateExpense}
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
          />
        )}

        {/* 영수증 세부 내역 팝업 모달 */}
        {viewReceiptExpense && (
          <ReceiptDetailModal
            expense={viewReceiptExpense}
            onClose={() => setViewReceiptExpense(null)}
          />
        )}
      </div>
    );
  }

  return (
    <div>
      {/* ── 일괄 삭제 툴바 ── */}
      {someChecked && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-red-50 border-b border-red-200">
          <span className="text-sm font-medium text-red-700">{checkIds.size}개 선택됨</span>
          <span className="text-gray-300">|</span>
          {!showBulkConfirm ? (
            <button onClick={() => setShowBulkConfirm(true)} className="flex items-center gap-1.5 px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-xs font-medium rounded-lg transition-colors"><Trash2 size={13} /> 선택 삭제</button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-600 font-medium">정말 삭제할까요?</span>
              <button onClick={handleBulkDelete} className="flex items-center gap-1 px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-xs font-medium rounded-lg transition-colors"><Check size={12} /> 삭제</button>
              <button onClick={() => setShowBulkConfirm(false)} className="flex items-center gap-1 px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-600 text-xs font-medium rounded-lg transition-colors"><X size={12} /> 취소</button>
            </div>
          )}
          <button onClick={() => { setCheckIds(new Set()); setShowBulkConfirm(false); }} className="ml-auto text-xs text-gray-400 hover:text-gray-600">선택 해제</button>
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
          <thead className="sticky top-0 z-10">
            <tr className="bg-gray-100 text-gray-600">
              <th className="border border-gray-300 px-2 py-2 w-[36px] text-center">
                <div onClick={toggleAll} className={`w-4 h-4 rounded border-2 cursor-pointer mx-auto flex items-center justify-center transition-colors ${allChecked ? 'bg-red-400 border-red-400' : someChecked ? 'bg-red-200 border-red-400' : 'border-gray-400 hover:border-red-400 bg-white'}`}>
                  {allChecked && <Check size={10} className="text-white" strokeWidth={3} />}
                  {!allChecked && someChecked && <span className="block w-2 h-0.5 bg-red-500 rounded" />}
                </div>
              </th>
              <th className="border border-gray-300 px-2 py-2 text-left font-semibold whitespace-nowrap w-[90px]">사용목적</th>
              <th className="border border-gray-300 px-2 py-2 text-left font-semibold whitespace-nowrap w-[80px]">날짜</th>
              {persons.length !== 1 && <th className="border border-gray-300 px-2 py-2 text-left font-semibold whitespace-nowrap w-[70px]">지출한 사람</th>}
              <th className="border border-gray-300 px-2 py-2 text-left font-semibold w-[320px]">내역</th>
              <th className="border border-gray-300 px-2 py-2 text-left font-semibold w-[200px]">구매처</th>
              <th className="border border-gray-300 px-2 py-2 text-right font-semibold w-[90px]">금액</th>
              <th className="border border-gray-300 px-2 py-2 text-left font-semibold w-[90px]">종류</th>
              <th className="border border-gray-300 px-2 py-2 text-left font-semibold whitespace-nowrap w-[90px]">지불방법</th>
              <th className="border border-gray-300 px-2 py-2 text-left font-semibold">기타</th>
              <th className="border border-gray-300 w-[36px]"></th>
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={colSpanTotal} className="border border-gray-100 py-16 text-center text-gray-400"><div className="flex flex-col items-center gap-2"><span className="text-4xl">🌷</span><span>이번 달 지출이 없어요. 아래에서 직접 입력하거나 영수증을 올려주세요 💕</span></div></td></tr>
            )}

            {rows.map((expense, idx) => {
              const isChecked = checkIds.has(expense.id);
              const isDragSelected = dragIds.has(expense.id);
              return (
                <tr
                  key={expense.id}
                  className={`group transition-colors h-9 ${
                    isDragSelected ? 'bg-blue-100 border-l-2 border-l-blue-400' :
                    isChecked ? 'bg-red-50 border-l-2 border-l-red-300' :
                    rowBg(expense.purpose, idx % 2 === 0)
                  }`}
                  onMouseDown={(e) => handleRowMouseDown(idx, e)}
                  onMouseEnter={(e) => handleRowMouseEnter(idx, e)}
                >
                  <td className="border border-gray-200 px-2 py-1 text-center">
                    <div onClick={() => toggleCheck(expense.id)} className={`w-4 h-4 rounded border-2 cursor-pointer mx-auto flex items-center justify-center transition-colors ${isChecked ? 'bg-red-400 border-red-400' : 'border-gray-300 hover:border-red-400 bg-white group-hover:border-gray-400'}`}>
                      {isChecked && <Check size={10} className="text-white" strokeWidth={3} />}
                    </div>
                  </td>

                  {Cell({ expense, field: 'purpose' })}
                  {Cell({ expense, field: 'date', className: 'whitespace-nowrap' })}
                  {persons.length !== 1 && Cell({ expense, field: 'person' })}
                  {Cell({ expense, field: 'item' })}
                  {Cell({ expense, field: 'place' })}
                  {Cell({ expense, field: 'amount', className: 'text-right' })}
                  {Cell({ expense, field: 'category' })}
                  {Cell({ expense, field: 'paymentMethod', className: 'whitespace-nowrap' })}
                  {Cell({ expense, field: 'memo', className: 'text-gray-500' })}

                  <td className="border border-gray-200 px-1 text-center">
                    {deleteId === expense.id ? (
                      <div className="flex gap-0.5 justify-center">
                        <button onClick={() => { deleteExpense(expense.id); setDeleteId(null); toast.success('삭제됐어요 🥺', { duration: 1200 }); }} className="text-red-500 hover:text-red-700 p-0.5"><Check size={12} /></button>
                        <button onClick={() => setDeleteId(null)} className="text-gray-400 hover:text-gray-600 p-0.5"><X size={12} /></button>
                      </div>
                    ) : (
                      <button onClick={() => setDeleteId(expense.id)} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all p-0.5"><Trash2 size={12} /></button>
                    )}
                  </td>
                </tr>
              );
            })}

            {/* 인라인 입력 행 */}
            <tr className="bg-amber-50/60 border-t-2 border-dashed border-amber-200">
              <td className="border border-amber-200" />
              <td className="border border-amber-200 px-1 py-1"><select value={newRow.purpose} onChange={(e) => setNewRow((f) => ({ ...f, purpose: e.target.value as Purpose, category: '' }))} className="w-full text-[11px] bg-transparent outline-none cursor-pointer">{PURPOSES.map((p) => <option key={p} value={p}>{getPurposeEmoji(p)} {p}</option>)}</select></td>
              <td className="border border-amber-200 px-1 py-1"><input type="text" value={newRow.date} onChange={(e) => { const { month, day } = parseDateInput(e.target.value); setNewRow((f) => ({ ...f, date: e.target.value, month, day })); }} placeholder="05월 15일" className="w-full text-[11px] bg-transparent outline-none" /></td>
              {persons.length !== 1 && (
                <td className="border border-amber-200 px-1 py-1">
                  {persons.length === 0
                    ? <input type="text" value={newRow.person} onChange={(e) => setNewRow((f) => ({ ...f, person: e.target.value }))} placeholder="이름" className="w-full text-[11px] bg-transparent outline-none" />
                    : <select value={newRow.person} onChange={(e) => setNewRow((f) => ({ ...f, person: e.target.value }))} className="w-full text-[11px] bg-transparent outline-none cursor-pointer"><option value="">선택</option>{persons.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}</select>}
                </td>
              )}
              <td className="border border-amber-200 px-1 py-1"><input type="text" value={newRow.item} onChange={(e) => setNewRow((f) => ({ ...f, item: e.target.value }))} onKeyDown={(e) => { if (e.key === 'Enter') handleAddRow(); }} placeholder="내역 입력..." className="w-full text-[11px] bg-transparent outline-none" /></td>
              <td className="border border-amber-200 px-1 py-1"><input type="text" value={newRow.place} onChange={(e) => setNewRow((f) => ({ ...f, place: e.target.value }))} placeholder="구매처" className="w-full text-[11px] bg-transparent outline-none" /></td>
              <td className="border border-amber-200 px-1 py-1"><input type="text" value={newRow.amount} onChange={(e) => setNewRow((f) => ({ ...f, amount: formatAmountInput(e.target.value) }))} placeholder="0" className="w-full text-[11px] bg-transparent outline-none text-right" /></td>
              <td className="border border-amber-200 px-1 py-1"><select value={newRow.category} onChange={(e) => setNewRow((f) => ({ ...f, category: e.target.value }))} className="w-full text-[11px] bg-transparent outline-none cursor-pointer"><option value="">-</option>{filteredCats(newRow.purpose).map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}</select></td>
              <td className="border border-amber-200 px-1 py-1"><select value={newRow.paymentMethod} onChange={(e) => setNewRow((f) => ({ ...f, paymentMethod: e.target.value as PaymentMethod }))} className="w-full text-[11px] bg-transparent outline-none cursor-pointer">{METHODS.map((m) => <option key={m} value={m}>{getPaymentEmoji(m)} {m}</option>)}</select></td>
              <td className="border border-amber-200 px-1 py-1"><input type="text" value={newRow.memo} onChange={(e) => setNewRow((f) => ({ ...f, memo: e.target.value }))} placeholder="메모" className="w-full text-[11px] bg-transparent outline-none" /></td>
              <td className="border border-amber-200 px-1 text-center"><button onClick={handleAddRow} className="p-1 text-amber-500 hover:text-amber-700 hover:bg-amber-100 rounded transition-colors" title="추가 (Enter)"><Plus size={14} /></button></td>
            </tr>

            {/* 합계 행 */}
            {rows.length > 0 && (
              <tr className="bg-gray-50 font-semibold">
                <td className="border border-gray-300" />
                <td className="border border-gray-300 px-2 py-1.5 text-xs text-gray-500" colSpan={persons.length !== 1 ? 4 : 3}>합계 ({rows.length}건)</td>
                <td className="border border-gray-300 px-2 py-1.5 text-xs text-right text-pink-700 font-bold">{formatAmount(rows.reduce((s, e) => s + e.amount, 0))}</td>
                <td className="border border-gray-300" colSpan={4} />
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── 드래그 선택 합계 상태바 ── */}
      {dragSel.length > 0 && (
        <div className="flex items-center gap-4 px-4 py-2 bg-gray-700 text-white text-xs rounded-b-xl">
          <span className="text-gray-400">선택 <strong className="text-white">{dragSel.length}개</strong></span>
          <span className="text-gray-600">|</span>
          <span className="text-gray-400">합계 <strong className="text-yellow-300">{formatAmount(dragSum)}</strong></span>
          <span className="text-gray-600">|</span>
          <span className="text-gray-400">평균 <strong className="text-green-300">{formatAmount(dragAvg)}</strong></span>
          <span className="text-gray-600">|</span>
          <span className="text-gray-400">최대 <strong className="text-red-300">{formatAmount(dragMax)}</strong></span>
          <span className="text-gray-600">|</span>
          <span className="text-gray-400">최소 <strong className="text-blue-300">{formatAmount(dragMin)}</strong></span>
          <button onClick={() => setDragIds(new Set())} className="ml-auto text-gray-500 hover:text-white"><X size={13} /></button>
        </div>
      )}

      <p className="text-[11px] text-gray-300 px-3 py-1.5">
        💡 셀 클릭으로 수정 · 꾹 누른 채 드래그 → 합계 표시 · 체크박스 → 일괄 삭제
      </p>

      {/* 데스크톱 영수증 세부 내역 팝업 모달 */}
      {viewReceiptExpense && (
        <ReceiptDetailModal
          expense={viewReceiptExpense}
          onClose={() => setViewReceiptExpense(null)}
        />
      )}
    </div>
  );
}

// ── 모바일용 지출 추가/수정 모달 컴포넌트 ──────────────────
interface ExpenseFormModalProps {
  mode: 'add' | 'edit';
  expense: Expense | null;
  onClose: () => void;
  categories: any[];
  persons: any[];
  addExpense: any;
  updateExpense: any;
  selectedYear: number;
  selectedMonth: number;
}

function ExpenseFormModal({
  mode,
  expense,
  onClose,
  categories,
  persons,
  addExpense,
  updateExpense,
  selectedYear,
  selectedMonth,
}: ExpenseFormModalProps) {
  const [purpose, setPurpose] = useState<Purpose>(expense?.purpose ?? '생활용');
  const [date, setDate] = useState(expense?.date ?? getTodayFormatted());
  const [person, setPerson] = useState(expense?.person ?? (persons.length === 1 ? persons[0].name : ''));
  const [item, setItem] = useState(expense?.item ?? '');
  const [place, setPlace] = useState(expense?.place ?? '');
  const [amount, setAmount] = useState(expense ? expense.amount.toLocaleString('ko-KR') : '');
  const [category, setCategory] = useState(expense?.category ?? '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(expense?.paymentMethod ?? '체크카드');
  const [memo, setMemo] = useState(expense?.memo ?? '');
  const [detailsText, setDetailsText] = useState(() => {
    if (!expense?.receiptDetails) return '';
    return expense.receiptDetails
      .map((d) => `${d.name} ${d.amount}${d.qty ? ` ${d.qty}` : ''}`)
      .join('\n');
  });

  // 사용목적 변경 시 카테고리 초기화
  useEffect(() => {
    if (mode === 'add' || (expense && expense.purpose !== purpose)) {
      setCategory('');
    }
  }, [purpose]);

  function handleSave() {
    if (!item && !amount) {
      toast.error('내역 또는 금액을 입력해주세요 🌷');
      return;
    }
    const numAmount = parseAmount(amount);

    // 날짜에서 월, 일 파싱
    const m = date.match(/(\d{1,2})월\s*(\d{1,2})일/);
    const month = m ? parseInt(m[1], 10) : selectedMonth;
    const day = m ? parseInt(m[2], 10) : 1;

    // 세부 내역 텍스트 파싱
    const parsedDetails = detailsText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const tokens = line.split(/\s+/);
        if (tokens.length < 2) return null;
        
        const lastToken = tokens[tokens.length - 1];
        const lastNum = parseInt(lastToken, 10);
        
        if (tokens.length >= 3 && !isNaN(lastNum)) {
          const secondLastToken = tokens[tokens.length - 2];
          const secondLastNum = parseInt(secondLastToken, 10);
          if (!isNaN(secondLastNum)) {
            const name = tokens.slice(0, tokens.length - 2).join(' ');
            return { name, amount: secondLastNum, qty: lastNum } as ReceiptDetail;
          }
        }
        
        if (!isNaN(lastNum)) {
          const name = tokens.slice(0, tokens.length - 1).join(' ');
          return { name, amount: lastNum, qty: 1 } as ReceiptDetail;
        }
        
        return null;
      })
      .filter((d): d is ReceiptDetail => d !== null);

    const data = {
      purpose,
      date,
      year: expense?.year ?? selectedYear,
      month,
      day,
      person: person || (persons.length === 1 ? persons[0].name : ''),
      item,
      place,
      amount: numAmount,
      category,
      paymentMethod,
      memo,
      receiptDetails: parsedDetails,
    };

    if (mode === 'add') {
      addExpense(data);
      toast.success('추가됐어요 🌸', { duration: 1200 });
    } else if (mode === 'edit' && expense) {
      updateExpense(expense.id, data);
      toast.success('수정됐어요 💕', { duration: 1200 });
    }
    onClose();
  }

  const filteredCats = categories.filter((c) => c.purpose === purpose).sort((a, b) => a.name.localeCompare(b.name, 'ko'));

  return (
    <div className="fixed inset-0 bg-black/40 modal-overlay z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-card w-full max-w-sm p-5 fade-in flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-bold text-gray-700">
            {mode === 'add' ? '🌸 새 지출 추가' : '✏️ 지출 내역 수정'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3.5 overflow-y-auto pr-1 flex-1 py-1">
          {/* 사용목적 (생활용/사업용/개인용 탭 버튼) */}
          <div>
            <label className="text-xs text-gray-400 block mb-1">사용목적</label>
            <div className="flex gap-1.5">
              {['생활용', '사업용', '개인용'].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPurpose(p as Purpose)}
                  className={`flex-1 py-2 text-xs rounded-xl font-medium transition-all ${
                    purpose === p
                      ? p === '생활용'
                        ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                        : p === '사업용'
                        ? 'bg-sky-100 text-sky-800 border border-sky-300'
                        : 'bg-pink-100 text-pink-800 border border-pink-300'
                      : 'bg-gray-50 text-gray-500 hover:bg-gray-100 border border-transparent'
                  }`}
                >
                  {getPurposeEmoji(p as Purpose)} {p}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* 날짜 */}
            <div>
              <label className="text-xs text-gray-400 block mb-1">날짜</label>
              <input
                type="text"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                placeholder="05월 15일"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-pink-300 bg-gray-50"
              />
            </div>
            {/* 지출한 사람 */}
            {persons.length > 1 ? (
              <div>
                <label className="text-xs text-gray-400 block mb-1">지출한 사람</label>
                <select
                  value={person}
                  onChange={(e) => setPerson(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-pink-300 bg-gray-50"
                >
                  <option value="">선택</option>
                  {persons.map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="text-xs text-gray-400 block mb-1">지출한 사람</label>
                <input
                  type="text"
                  readOnly
                  value={person || (persons.length === 1 ? persons[0].name : '나')}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs bg-gray-100 text-gray-400 cursor-not-allowed"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* 내역 */}
            <div>
              <label className="text-xs text-gray-400 block mb-1">지출 내역 *</label>
              <input
                type="text"
                value={item}
                onChange={(e) => setItem(e.target.value)}
                placeholder="예: 마트 장보기"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-pink-300"
              />
            </div>
            {/* 구매처 */}
            <div>
              <label className="text-xs text-gray-400 block mb-1">구매처</label>
              <input
                type="text"
                value={place}
                onChange={(e) => setPlace(e.target.value)}
                placeholder="예: 이마트"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-pink-300"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* 금액 */}
            <div>
              <label className="text-xs text-gray-400 block mb-1">금액 *</label>
              <input
                type="text"
                value={amount}
                onChange={(e) => setAmount(formatAmountInput(e.target.value))}
                placeholder="0"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-pink-300 text-right font-medium"
              />
            </div>
            {/* 카테고리 */}
            <div>
              <label className="text-xs text-gray-400 block mb-1">카테고리</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-pink-300 bg-gray-50"
              >
                <option value="">-</option>
                {filteredCats.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* 지불방법 */}
            <div>
              <label className="text-xs text-gray-400 block mb-1">지불방법</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-pink-300 bg-gray-50"
              >
                {METHODS.map((m) => (
                  <option key={m} value={m}>
                    {getPaymentEmoji(m)} {m}
                  </option>
                ))}
              </select>
            </div>
            {/* 메모 */}
            <div>
              <label className="text-xs text-gray-400 block mb-1">메모</label>
              <input
                type="text"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="기타 참고사항"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-pink-300"
              />
            </div>
          </div>

          {/* 영수증 세부 내역 직접 편집 */}
          <div className="border-t border-gray-100 pt-3">
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-gray-500 block">🧾 영수증 세부 품목 직접 입력/수정</label>
              <span className="text-[9px] text-gray-400">형식: 품목명 금액 [수량]</span>
            </div>
            <textarea
              value={detailsText}
              onChange={(e) => setDetailsText(e.target.value)}
              placeholder="예: 서울우유 1.8L 5400 1&#10;신라면 5입 4100 2"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-pink-300 font-mono h-24 resize-none bg-gray-50/50"
            />
          </div>
        </div>

        <div className="flex gap-2.5 mt-5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 border border-pink-200 text-pink-600 rounded-xl hover:bg-pink-50 transition-colors text-xs font-medium"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 py-2.5 bg-pink-400 hover:bg-pink-500 text-white rounded-xl transition-colors text-xs font-medium"
          >
            {mode === 'add' ? '추가하기' : '수정완료'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 영수증 상세 품목 조회 모달 컴포넌트 ──────────────────
interface ReceiptDetailModalProps {
  expense: Expense;
  onClose: () => void;
}

function ReceiptDetailModal({ expense, onClose }: ReceiptDetailModalProps) {
  const details = expense.receiptDetails || [];

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-3xl shadow-card w-full max-w-sm p-6 border border-gray-100 flex flex-col font-mono text-xs text-gray-800 fade-in">
        {/* 상단 톱니 스티커 느낌 장식 */}
        <div className="flex justify-center -mt-6 mb-4">
          <div className="bg-pink-100 text-pink-700 text-[10px] px-3 py-1 rounded-full font-bold shadow-soft">
            RECEIPT DETAILS
          </div>
        </div>

        <div className="text-center mb-3">
          <h3 className="text-sm font-bold text-gray-700 mb-1">🛒 {expense.place || '구매처 정보 없음'}</h3>
          <p className="text-[10px] text-gray-400">일시: {expense.date} · 구분: {expense.purpose}</p>
        </div>

        <div className="border-t border-dashed border-gray-300 my-2" />

        {/* 품목 리스트 */}
        <div className="flex-1 overflow-y-auto max-h-[300px] py-1 space-y-1.5">
          <div className="flex justify-between font-bold text-gray-500 mb-1">
            <span>품목명</span>
            <div className="flex gap-4">
              <span className="w-8 text-center">수량</span>
              <span className="w-16 text-right">금액</span>
            </div>
          </div>

          <div className="border-t border-dashed border-gray-100 my-1" />

          {details.map((item, idx) => (
            <div key={idx} className="flex justify-between items-start gap-2">
              <span className="text-gray-700 truncate max-w-[180px]">{item.name}</span>
              <div className="flex gap-4 items-center shrink-0">
                <span className="w-8 text-center text-gray-500">{item.qty ?? 1}</span>
                <span className="w-16 text-right text-gray-700 tabular-nums">{(item.amount).toLocaleString('ko-KR')}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-dashed border-gray-300 my-2.5" />

        {/* 합계 */}
        <div className="flex justify-between items-center text-sm font-bold text-gray-900 mb-4">
          <span>합계 금액</span>
          <span className="text-pink-600 text-base font-extrabold tabular-nums">
            {(expense.amount).toLocaleString('ko-KR')}원
          </span>
        </div>

        {/* 상세 설명 (있을 때만) */}
        {expense.memo && (
          <div className="bg-gray-50 rounded-xl p-2.5 text-[10px] text-gray-500 mb-4 italic">
            💬 {expense.memo}
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full py-2.5 bg-gray-800 hover:bg-gray-900 text-white rounded-2xl transition-colors font-medium text-xs text-center"
        >
          확인 (닫기)
        </button>
      </div>
    </div>
  );
}
