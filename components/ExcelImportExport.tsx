// ===================================================
// 엑셀 가져오기/내보내기 컴포넌트
// ===================================================

'use client';

import { useRef, useState } from 'react';
import { useBudgetStore, getMonthExpenses, applyFilter } from '@/lib/store';
import { exportToExcel, importFromExcel, detectCardFromFilename } from '@/lib/excel';
import { getMonthLabel } from '@/lib/utils';
import { Download, Upload, X, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { ImportMode } from '@/lib/types';

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
    detectedCard: string | null; // 파일명에서 감지한 카드명
  } | null>(null);

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
    } catch (err) {
      toast.error('내보내기에 실패했어요 😢');
    }
  }

  // ── 가져오기: 파일 선택 ──────────────────────────
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // 파일명에서 카드사 감지 (하나/삼성/국민/현대 등)
    const detectedCard = detectCardFromFilename(file.name);
    if (detectedCard) {
      toast(`💳 ${detectedCard} 파일로 인식됐어요`, { duration: 2000 });
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = ev.target?.result as ArrayBuffer;
        // 파일명에서 감지한 카드명을 기본 지불방법으로 전달
        const result = importFromExcel(data, detectedCard ?? undefined);

        if (result.expenses.length === 0) {
          toast.error('가져올 지출 데이터가 없어요 🥺');
          return;
        }

        setPendingImport({ ...result, detectedCard });
        setShowImportModal(true);
      } catch (err) {
        toast.error('파일을 읽는 중 오류가 발생했어요 😢');
      }
    };
    reader.readAsArrayBuffer(file);
    // 같은 파일 재선택 가능하도록 초기화
    e.target.value = '';
  }

  // ── 가져오기: 모드 선택 후 실행 ──────────────────
  function handleImportConfirm(mode: ImportMode) {
    if (!pendingImport) return;
    const { expenses: newExp, categories: newCats, persons: newPers } = pendingImport;

    if (mode === 'overwrite') {
      replaceAll(newExp, newCats.length > 0 ? newCats : categories, newPers.length > 0 ? newPers : persons);
      toast.success(`${newExp.length}개 지출로 교체했어요 🌸`);
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

            <p className="text-sm text-gray-600 mb-3">
              <span className="font-semibold text-pink-600">{pendingImport.expenses.length}개</span>의 지출 항목을 발견했어요.
              어떻게 불러올까요?
            </p>

            {/* 카드사 감지 안내 */}
            {pendingImport.detectedCard && (
              <div className="mb-3 px-3 py-2 bg-blue-50 rounded-xl text-xs text-blue-700 flex items-center gap-1.5">
                <span>💳</span>
                <span>지불방법이 없는 항목은 <strong>{pendingImport.detectedCard}</strong>로 자동 설정됐어요</span>
              </div>
            )}

            {/* 경고 메시지 */}
            {pendingImport.warnings.length > 0 && (
              <div className="mb-3 p-2 bg-yellow-50 rounded-xl text-xs text-yellow-700 flex gap-1.5">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <div>
                  {pendingImport.warnings.slice(0, 2).map((w, i) => <p key={i}>{w}</p>)}
                  {pendingImport.warnings.length > 2 && <p>외 {pendingImport.warnings.length - 2}개...</p>}
                </div>
              </div>
            )}

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
                <span className="font-medium text-red-600">덮어쓰기</span>
                <p className="text-xs text-gray-500 mt-0.5">기존 데이터를 모두 지우고 새로 불러오기</p>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
