// ===================================================
// 영수증/이미지 업로드 + OCR 미리보기 모달
// ===================================================

'use client';

import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { useBudgetStore } from '@/lib/store';
import { extractReceipt, categorizeBatch } from '@/lib/claude';
import { ReceiptItem, PaymentMethod, Purpose } from '@/lib/types';
import { formatAmount, parseAmount, formatAmountInput, getCurrentYearMonth, getPurposeEmoji } from '@/lib/utils';
import { X, Upload, Loader2, CheckCircle, Clipboard } from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
  onClose: () => void;
}

const METHODS: PaymentMethod[] = ['현금', '체크카드', '신용카드', '계좌이체', '기타'];
const PURPOSES: Purpose[] = ['생활용', '사업용', '개인용'];

export default function ReceiptUploader({ onClose }: Props) {
  const { addExpenses, categories } = useBudgetStore();
  const { year, month } = getCurrentYearMonth();

  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [items, setItems] = useState<(ReceiptItem & { purpose: Purpose; include: boolean })[]>([]);

  // 파일 드롭 처리
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const imageFiles = acceptedFiles.filter((f) => f.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      toast.error('이미지 파일을 업로드해주세요 🌷');
      return;
    }

    setIsOcrLoading(true);
    try {
      const allItems: (ReceiptItem & { purpose: Purpose; include: boolean })[] = [];
      for (const file of imageFiles) {
        const extracted = await extractReceipt(file);
        const withDefaults = extracted.map((it) => ({
          ...it,
          purpose: '생활용' as Purpose,
          include: true,
        }));
        allItems.push(...withDefaults);
      }

      if (allItems.length === 0) {
        toast('영수증에서 항목을 찾지 못했어요 🥺', { icon: '⚠️' });
      } else {
        setItems(allItems);
        toast.success(`${allItems.length}개 항목을 인식했어요 ✨`);
      }
    } catch (err) {
      toast.error('영수증 인식에 실패했어요 😢');
    } finally {
      setIsOcrLoading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp'] },
    multiple: true,
  });

  // ── Ctrl+V 붙여넣기로 클립보드 이미지 처리 ──────────
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = Array.from(e.clipboardData?.items ?? []);
      const imageItems = items.filter((item) => item.type.startsWith('image/'));
      if (imageItems.length === 0) return;

      e.preventDefault();
      const files = imageItems
        .map((item) => item.getAsFile())
        .filter((f): f is File => f !== null);

      if (files.length > 0) {
        toast('클립보드 이미지를 인식했어요 📋', { duration: 1500 });
        onDrop(files);
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [onDrop]);

  // 미리보기 항목 수정
  function updateItem(idx: number, updates: Partial<typeof items[0]>) {
    setItems((prev) => prev.map((it, i) => i === idx ? { ...it, ...updates } : it));
  }

  // 일괄 추가
  async function handleAddAll() {
    const selected = items.filter((it) => it.include);
    if (selected.length === 0) {
      toast.error('추가할 항목을 선택해주세요');
      return;
    }

    setIsAdding(true);
    try {
      // AI 카테고리 일괄 분류
      toast('AI가 카테고리를 분류하는 중이에요... ✨', { duration: 2000 });
      const results = await categorizeBatch(
        selected.map((it) => ({ item: it.item, place: it.place, amount: it.amount, purpose: it.purpose })),
        categories
      );

      const today = new Date();
      const expenses = selected.map((it, i) => {
        const res = results[i];
        const dateMatch = it.date?.match(/(\d{1,2})월\s*(\d{1,2})일/);
        const m = dateMatch ? parseInt(dateMatch[1], 10) : month;
        const d = dateMatch ? parseInt(dateMatch[2], 10) : today.getDate();

        return {
          purpose: it.purpose,
          date: it.date || `${m}월 ${String(d).padStart(2, '0')}일`,
          year,
          month: m,
          day: d,
          person: '',
          item: it.item,
          place: it.place,
          amount: it.amount,
          category: res.category ?? '',
          paymentMethod: (it.method || '기타') as PaymentMethod,
          memo: '',
          categoryConfidence: res.confidence,
          categoryReason: res.reason,
        };
      });

      addExpenses(expenses);
      toast.success(`${selected.length}개 지출이 추가됐어요 🌸`);
      onClose();
    } catch {
      toast.error('추가 중 오류가 발생했어요 😢');
    } finally {
      setIsAdding(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 modal-overlay z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-card w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-pink-100">
          <h2 className="font-semibold text-gray-700">📸 영수증 업로드</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* 드롭존 */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors ${
              isDragActive ? 'dropzone-active border-pink-400 bg-pink-50' : 'border-pink-200 hover:border-pink-300'
            }`}
          >
            <input {...getInputProps()} />
            {isOcrLoading ? (
              <div className="flex flex-col items-center gap-2 text-pink-500">
                <Loader2 size={32} className="spinner" />
                <p className="text-sm">AI가 분석 중이에요... ✨</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-gray-400">
                <Upload size={32} />
                <p className="text-sm font-medium">영수증 이미지를 드래그하거나 클릭해서 업로드</p>
                <div className="flex items-center gap-3 text-xs mt-1">
                  <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-lg text-gray-500">
                    <Clipboard size={12} />
                    <kbd className="font-mono font-semibold">Ctrl</kbd>+<kbd className="font-mono font-semibold">V</kbd>
                    로 붙여넣기도 가능해요!
                  </span>
                </div>
                <p className="text-xs text-gray-300">JPG · PNG · GIF · WEBP · 여러 장 동시 가능</p>
              </div>
            )}
          </div>

          {/* 미리보기 테이블 */}
          {items.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-700">인식된 항목 ({items.filter((i) => i.include).length}개 선택)</p>
                <button
                  onClick={() => setItems((prev) => prev.map((it) => ({ ...it, include: !it.include })))}
                  className="text-xs text-pink-400 hover:text-pink-600"
                >
                  전체 선택/해제
                </button>
              </div>

              <div className="table-wrapper border border-pink-100 rounded-xl overflow-hidden">
                <table className="w-full text-xs min-w-[600px]">
                  <thead>
                    <tr className="bg-pink-50">
                      <th className="px-2 py-2 text-center">✓</th>
                      <th className="px-2 py-2 text-left">날짜</th>
                      <th className="px-2 py-2 text-left">내역</th>
                      <th className="px-2 py-2 text-left">구매처</th>
                      <th className="px-2 py-2 text-right">금액</th>
                      <th className="px-2 py-2 text-left">지출방법</th>
                      <th className="px-2 py-2 text-left">사용목적</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, i) => (
                      <tr key={i} className={`border-t border-pink-50 ${!it.include ? 'opacity-40' : ''}`}>
                        <td className="px-2 py-1.5 text-center">
                          <input
                            type="checkbox"
                            checked={it.include}
                            onChange={(e) => updateItem(i, { include: e.target.checked })}
                            className="accent-pink-400"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            type="text"
                            value={it.date}
                            onChange={(e) => updateItem(i, { date: e.target.value })}
                            className="w-20 border border-pink-200 rounded px-1 py-0.5 text-xs"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            type="text"
                            value={it.item}
                            onChange={(e) => updateItem(i, { item: e.target.value })}
                            className="w-28 border border-pink-200 rounded px-1 py-0.5 text-xs"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            type="text"
                            value={it.place}
                            onChange={(e) => updateItem(i, { place: e.target.value })}
                            className="w-24 border border-pink-200 rounded px-1 py-0.5 text-xs"
                          />
                        </td>
                        <td className="px-2 py-1.5 text-right">
                          <input
                            type="text"
                            value={it.amount.toLocaleString('ko-KR')}
                            onChange={(e) => updateItem(i, { amount: parseAmount(e.target.value) })}
                            className="w-24 border border-pink-200 rounded px-1 py-0.5 text-xs text-right"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <select
                            value={it.method}
                            onChange={(e) => updateItem(i, { method: e.target.value as PaymentMethod })}
                            className="border border-pink-200 rounded px-1 py-0.5 text-xs"
                          >
                            {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                          </select>
                        </td>
                        <td className="px-2 py-1.5">
                          <select
                            value={it.purpose}
                            onChange={(e) => updateItem(i, { purpose: e.target.value as Purpose })}
                            className="border border-pink-200 rounded px-1 py-0.5 text-xs"
                          >
                            {PURPOSES.map((p) => <option key={p} value={p}>{getPurposeEmoji(p)} {p}</option>)}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* 하단 버튼 */}
        {items.length > 0 && (
          <div className="px-5 py-3 border-t border-pink-100 flex justify-end gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">
              취소
            </button>
            <button
              onClick={handleAddAll}
              disabled={isAdding || items.every((it) => !it.include)}
              className="flex items-center gap-2 px-5 py-2 bg-pink-400 hover:bg-pink-500 disabled:opacity-50 text-white text-sm font-medium rounded-2xl transition-colors"
            >
              {isAdding ? (
                <><Loader2 size={14} className="spinner" /> 추가 중...</>
              ) : (
                <><CheckCircle size={14} /> 일괄 추가 ({items.filter((i) => i.include).length}건)</>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
