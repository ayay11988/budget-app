// ===================================================
// 카테고리 관리 화면 (설정 페이지에서 사용)
// ===================================================

'use client';

import { useState } from 'react';
import { useBudgetStore } from '@/lib/store';
import { Category, Purpose } from '@/lib/types';
import { getPurposeEmoji, getPurposeColorClass } from '@/lib/utils';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';

const PURPOSES: Purpose[] = ['생활용', '사업용', '개인용'];

interface EditingCategory {
  id: string;
  purpose: Purpose;
  name: string;
  description: string;
}

export default function CategoryManager() {
  const { categories, addCategory, updateCategory, deleteCategory } = useBudgetStore();
  const [editing, setEditing] = useState<EditingCategory | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newCategory, setNewCategory] = useState<Omit<Category, 'id'>>({
    purpose: '생활용',
    name: '',
    description: '',
  });
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // 카테고리를 사용목적별로 그룹화
  const grouped = PURPOSES.map((purpose) => ({
    purpose,
    categories: categories.filter((c) => c.purpose === purpose),
  }));

  function handleAdd() {
    if (!newCategory.name.trim()) {
      toast.error('카테고리 이름을 입력해주세요');
      return;
    }
    addCategory(newCategory);
    setNewCategory({ purpose: '생활용', name: '', description: '' });
    setIsAdding(false);
    toast.success('카테고리가 추가됐어요 🌸');
  }

  function handleUpdate() {
    if (!editing) return;
    if (!editing.name.trim()) {
      toast.error('카테고리 이름을 입력해주세요');
      return;
    }
    updateCategory(editing.id, { purpose: editing.purpose, name: editing.name, description: editing.description });
    setEditing(null);
    toast.success('카테고리가 수정됐어요 💕');
  }

  function handleDelete(id: string) {
    deleteCategory(id);
    setDeleteConfirmId(null);
    toast.success('카테고리가 삭제됐어요');
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-700">🗂️ 카테고리 관리</h2>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-pink-400 hover:bg-pink-500 text-white text-sm rounded-xl transition-colors"
        >
          <Plus size={15} />
          카테고리 추가
        </button>
      </div>

      {/* 새 카테고리 추가 폼 */}
      {isAdding && (
        <div className="bg-pink-50 rounded-2xl p-4 border border-pink-200 fade-in">
          <h3 className="text-sm font-medium text-pink-700 mb-3">새 카테고리</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">사용목적</label>
              <select
                value={newCategory.purpose}
                onChange={(e) => setNewCategory((f) => ({ ...f, purpose: e.target.value as Purpose }))}
                className="w-full border border-pink-200 rounded-xl px-2 py-1.5 text-sm focus:outline-none focus:border-pink-400"
              >
                {PURPOSES.map((p) => <option key={p} value={p}>{getPurposeEmoji(p)} {p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">카테고리명 *</label>
              <input
                type="text"
                value={newCategory.name}
                onChange={(e) => setNewCategory((f) => ({ ...f, name: e.target.value }))}
                placeholder="예: 교통비"
                className="w-full border border-pink-200 rounded-xl px-2 py-1.5 text-sm focus:outline-none focus:border-pink-400"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">분류 기준 설명 (AI 활용)</label>
              <input
                type="text"
                value={newCategory.description}
                onChange={(e) => setNewCategory((f) => ({ ...f, description: e.target.value }))}
                placeholder="예: 택시, 버스, 지하철 등"
                className="w-full border border-pink-200 rounded-xl px-2 py-1.5 text-sm focus:outline-none focus:border-pink-400"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <button onClick={() => setIsAdding(false)} className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700">취소</button>
            <button onClick={handleAdd} className="px-4 py-1.5 bg-pink-400 hover:bg-pink-500 text-white text-sm rounded-xl transition-colors">
              추가하기
            </button>
          </div>
        </div>
      )}

      {/* 사용목적별 카테고리 목록 */}
      {grouped.map(({ purpose, categories: cats }) => (
        <div key={purpose} className="bg-white rounded-2xl shadow-soft overflow-hidden">
          <div className={`px-4 py-2.5 flex items-center gap-2 ${
            purpose === '생활용' ? 'bg-pink-50' : purpose === '사업용' ? 'bg-blue-50' : 'bg-green-50'
          }`}>
            <span className="font-semibold text-sm text-gray-700">{getPurposeEmoji(purpose)} {purpose}</span>
            <span className="text-xs text-gray-400">({cats.length}개)</span>
          </div>

          {cats.length === 0 ? (
            <p className="px-4 py-3 text-sm text-gray-400">카테고리가 없어요</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {cats.map((cat) => (
                <div key={cat.id} className="px-4 py-3">
                  {editing?.id === cat.id ? (
                    // 편집 모드
                    <div className="flex flex-col gap-2 fade-in">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-gray-400 mb-1 block">카테고리명</label>
                          <input
                            autoFocus
                            type="text"
                            value={editing.name}
                            onChange={(e) => setEditing((f) => f ? { ...f, name: e.target.value } : null)}
                            className="w-full border border-pink-300 rounded-lg px-2 py-1 text-sm focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 mb-1 block">사용목적</label>
                          <select
                            value={editing.purpose}
                            onChange={(e) => setEditing((f) => f ? { ...f, purpose: e.target.value as Purpose } : null)}
                            className="w-full border border-pink-300 rounded-lg px-2 py-1 text-sm focus:outline-none"
                          >
                            {PURPOSES.map((p) => <option key={p} value={p}>{getPurposeEmoji(p)} {p}</option>)}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 mb-1 block">분류 기준 설명</label>
                        <input
                          type="text"
                          value={editing.description}
                          onChange={(e) => setEditing((f) => f ? { ...f, description: e.target.value } : null)}
                          className="w-full border border-pink-300 rounded-lg px-2 py-1 text-sm focus:outline-none"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setEditing(null)} className="p-1.5 text-gray-400 hover:text-gray-600"><X size={16} /></button>
                        <button onClick={handleUpdate} className="p-1.5 text-pink-500 hover:text-pink-700"><Check size={16} /></button>
                      </div>
                    </div>
                  ) : (
                    // 보기 모드
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${getPurposeColorClass(cat.purpose)}`}>
                            {cat.name}
                          </span>
                        </div>
                        {cat.description && (
                          <p className="text-xs text-gray-400 mt-1">{cat.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => setEditing({ id: cat.id, purpose: cat.purpose, name: cat.name, description: cat.description })}
                          className="p-1.5 text-gray-300 hover:text-blue-400 transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                        {deleteConfirmId === cat.id ? (
                          <>
                            <button onClick={() => handleDelete(cat.id)} className="p-1.5 text-red-500 hover:text-red-700"><Check size={14} /></button>
                            <button onClick={() => setDeleteConfirmId(null)} className="p-1.5 text-gray-400 hover:text-gray-600"><X size={14} /></button>
                          </>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirmId(cat.id)}
                            className="p-1.5 text-gray-300 hover:text-red-400 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
