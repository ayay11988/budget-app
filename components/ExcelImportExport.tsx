// ===================================================
// 엑셀 가져오기/내보내기 컴포넌트
// ===================================================

'use client';

import { useRef, useState, useEffect } from 'react';
import { useBudgetStore, getMonthExpenses, applyFilter } from '@/lib/store';
import { exportToExcel, importFromExcel, detectCardFromFilename } from '@/lib/excel';
import { getMonthLabel } from '@/lib/utils';
import { Download, Upload, X, AlertCircle, Undo2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { ImportMode, Expense, Category, Person } from '@/lib/types';

interface UndoSnapshot {
  expenses: Expense[];
  categories: Category[];
  persons: Person[];
  count: number;       // 가져온 항목 수 (안내 메시지용)
  mode: ImportMode;
}

export default function ExcelImportExport() {
  const {
    expenses, categories, persons,
    selectedYear, selectedMonth, filter,
    replaceAll, mergeExpenses,
  } = useBudgetStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [pendingImport, setPendingImport] = useState<{
    expenses: ReturnType<typeof importFromExcel>['expenses'];
    categories: ReturnType<typeof importFromExcel>['categories'];
    persons: ReturnType<typeof importFromExcel>['persons'];
    warnings: string[];
    detectedCard: string | null;
  } | null>(null);

  // ── 실행취소 스냅샷 ──────────────────────────────
  const [undoSnapshot, setUndoSnapshot] = useState<UndoSnapshot | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 60초 후 자동으로 실행취소 버튼 사라짐
  useEffect(() => {
    if (undoSnapshot) {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      undoTimerRef.current = setTimeout(() => setUndoSnapshot(null), 60000);
    }
    return () => { if (undoTimerRef.current) clearTimeout(undoTimerRef.current); };
  }, [undoSnapshot]);

  function handleUndo() {
    if (!undoSnapshot) return;
    replaceAll(undoSnapshot.expenses, undoSnapshot.categories, undoSnapshot.persons);
    toast.success(`가져오기를 취소했어요 ↩️ (${undoSnapshot.count}개 항목 삭제됨)`);
    setUndoSnapshot(null);
  }

  // ── 내보내기 ──────────────────────────────────────
  function handleExport(mode: 'current' | 'all' | 'filtered') {
    try {
      const label = getMonthLabel(selectedYear, selectedMonth);
      let targetExpenses = expenses;

      if (mode === 'current') {
        targetExpenses = getMonthExpenses(expenses, selectedYear, selectedMonth);
      } else if (mode === 'filtered') {
        targetExpenses = applyFilter(
          getMonthExpenses(expenses, selectedYear, selectedMonth),
          filter
        );
      }

      exportToExcel(targetExpenses, categories, persons, { mode, year: selectedYear, month: selectedMonth, label });
      toast.success('엑셀 파일이 다운로드됐어요 📥');
      setShowExportModal(false);
    } catch {
      toast.error('내보내기에 실패했어요 😢');
    }
  }

  // ── 가져오기: 파일 선택 ──────────────────────────
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const detectedCard = detectCardFromFilename(file.name);
    if (detectedCard) {
      toast(`💳 ${detectedCard} 파일로 인식됐어요`, { duration: 2000 });
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = ev.target?.result as ArrayBuffer;
        const result = importFromExcel(data, detectedCard ?? undefined);

        setPendingImport({ ...result, detectedCard });
        setShowImportModal(true);
      } catch {
        toast.error('파일을 읽는 중 오류가 발생했어요 😢');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  }

  // ── 가져오기: 모드 선택 후 실행 ──────────────────
  function handleImportConfirm(mode: ImportMode) {
    if (!pendingImport) return;
    const { expenses: newExp, categories: newCats, persons: newPers } = pendingImport;

    // 실행 전 스냅샷 저장 (실행취소용)
    setUndoSnapshot({
      expenses: [...expenses],
      categories: [...categories],
      persons: [...persons],
      count: newExp.length,
      mode,
    });

    if (mode === 'overwrite') {
      // 가져온 데이터에 포함된 연월만 교체 — 다른 달 데이터는 그대로 유지
      const importedMonthKeys = new Set(newExp.map((e) => `${e.year}-${e.month}`));
      const kept = expenses.filter((e) => !importedMonthKeys.has(`${e.year}-${e.month}`));
      replaceAll(
        [...kept, ...newExp],
        newCats.length > 0 ? newCats : categories,
        newPers.length > 0 ? newPers : persons,
      );
      const monthList = Array.from(importedMonthKeys)
        .sort()
        .map((k) => { const [y, m] = k.split('-'); return `${y}년 ${m}월`; })
        .join(', ');
      toast.success(`${importedMonthKeys.size}개월 교체 완료 (${monthList}) 🌸`);
    } else {
      mergeExpenses(newExp, newCats, newPers);
      toast.success(`중복 제외 후 병합했어요 💕`);
    }

    setPendingImport(null);
    setShowImportModal(false);
  }

  return (
    <>
      {/* 버튼 2개 */}
      <div className="flex gap-2">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-2 text-sm bg-green-100 hover:bg-green-200 text-green-700 rounded-xl transition-colors"
        >
          <Upload size={15} />
          <span className="hidden sm:inline">엑셀 불러오기</span>
          <span className="sm:hidden">불러오기</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileSelect}
          className="hidden"
        />

        <button
          onClick={() => setShowExportModal(true)}
          className="flex items-center gap-1.5 px-3 py-2 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-xl transition-colors"
        >
          <Download size={15} />
          <span className="hidden sm:inline">엑셀 내보내기</span>
          <span className="sm:hidden">내보내기</span>
        </button>
      </div>

      {/* ── 가져오기 실행취소 플로팅 버튼 ── */}
      {undoSnapshot && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-gray-900 text-white px-4 py-3 rounded-2xl shadow-xl fade-in">
          <span className="text-sm">
            <span className="font-semibold text-yellow-300">{undoSnapshot.count}개</span> 항목을 가져왔어요
          </span>
          <button
            onClick={handleUndo}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-400 text-white text-sm font-medium rounded-xl transition-colors"
          >
            <Undo2 size={14} />
            전부 취소
          </button>
          <button
            onClick={() => setUndoSnapshot(null)}
            className="text-gray-400 hover:text-gray-200"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── 내보내기 모달 ── */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/30 modal-overlay z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-card w-full max-w-sm p-5 fade-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-700">📤 엑셀 내보내기</h3>
              <button onClick={() => setShowExportModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => handleExport('current')}
                className="w-full px-4 py-3 text-sm text-left bg-pink-50 hover:bg-pink-100 rounded-xl transition-colors"
              >
                <span className="font-medium text-pink-700">이번 달만</span>
                <p className="text-xs text-gray-500 mt-0.5">{getMonthLabel(selectedYear, selectedMonth)} 데이터</p>
              </button>
              <button
                onClick={() => handleExport('all')}
                className="w-full px-4 py-3 text-sm text-left bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
              >
                <span className="font-medium text-blue-700">전체 데이터</span>
                <p className="text-xs text-gray-500 mt-0.5">월별 시트로 자동 분리</p>
              </button>
              <button
                onClick={() => handleExport('filtered')}
                className="w-full px-4 py-3 text-sm text-left bg-green-50 hover:bg-green-100 rounded-xl transition-colors"
              >
                <span className="font-medium text-green-700">필터 결과만</span>
                <p className="text-xs text-gray-500 mt-0.5">현재 적용된 필터 기준</p>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 가져오기 모드 선택 모달 ── */}
      {showImportModal && pendingImport && (
        <div className="fixed inset-0 bg-black/30 modal-overlay z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-card w-full max-w-sm p-5 fade-in">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-700">📥 엑셀 불러오기</h3>
              <button onClick={() => { setShowImportModal(false); setPendingImport(null); }} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            {pendingImport.expenses.length === 0 ? (
              <p className="text-sm text-red-600 mb-3 font-medium">
                🥺 지출 데이터를 인식하지 못했어요. 아래 컬럼 정보를 확인해주세요.
              </p>
            ) : (
              <p className="text-sm text-gray-600 mb-3">
                <span className="font-semibold text-pink-600">{pendingImport.expenses.length}개</span>의 지출 항목을 발견했어요.
                어떻게 불러올까요?
              </p>
            )}

            {/* 카드사 감지 안내 */}
            {pendingImport.detectedCard && (
              <div className="mb-3 px-3 py-2 bg-blue-50 rounded-xl text-xs text-blue-700 flex items-center gap-1.5">
                <span>💳</span>
                <span>지불방법이 없는 항목은 <strong>{pendingImport.detectedCard}</strong>로 자동 설정됐어요</span>
              </div>
            )}

            {/* 진단 경고 메시지 */}
            {pendingImport.warnings.length > 0 && (
              <div className="mb-3 p-3 bg-yellow-50 rounded-xl text-xs text-yellow-800 space-y-1 max-h-52 overflow-y-auto">
                <div className="flex items-center gap-1 font-semibold mb-1">
                  <AlertCircle size={13} /> 진단 정보
                </div>
                {pendingImport.warnings.map((w, i) => (
                  <p key={i} className="break-all leading-relaxed">{w}</p>
                ))}
              </div>
            )}

            {pendingImport.expenses.length > 0 && (
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => handleImportConfirm('merge')}
                  className="w-full px-4 py-3 text-sm text-left bg-green-50 hover:bg-green-100 rounded-xl transition-colors"
                >
                  <span className="font-medium text-green-700">병합</span>
                  <p className="text-xs text-gray-500 mt-0.5">기존 데이터 유지 + 새 데이터 추가 (중복 제외)</p>
                </button>
                <button
                  onClick={() => handleImportConfirm('overwrite')}
                  className="w-full px-4 py-3 text-sm text-left bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
                >
                  <span className="font-medium text-red-600">해당 월 교체</span>
                  <p className="text-xs text-gray-500 mt-0.5">가져온 데이터의 달만 교체 · 다른 달은 유지</p>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
