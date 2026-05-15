// ===================================================
// 지출한 사람 관리 화면 (설정 페이지에서 사용)
// ===================================================

'use client';

import { useState } from 'react';
import { useBudgetStore } from '@/lib/store';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PersonManager() {
  const { persons, addPerson, updatePerson, deletePerson } = useBudgetStore();
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  function handleAdd() {
    const name = newName.trim();
    if (!name) {
      toast.error('이름을 입력해주세요');
      return;
    }
    if (persons.some((p) => p.name === name)) {
      toast.error('이미 등록된 이름이에요');
      return;
    }
    addPerson(name);
    setNewName('');
    toast.success(`${name}님이 등록됐어요 💕`);
  }

  function handleUpdate(id: string) {
    const name = editingName.trim();
    if (!name) {
      toast.error('이름을 입력해주세요');
      return;
    }
    updatePerson(id, name);
    setEditingId(null);
    toast.success('이름이 수정됐어요 💕');
  }

  function handleDelete(id: string) {
    deletePerson(id);
    setDeleteConfirmId(null);
    toast.success('삭제됐어요');
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-700">👤 지출한 사람 관리</h2>

      {/* 안내 메시지 */}
      <div className="bg-pastel-cream rounded-2xl p-3 text-sm text-yellow-700">
        <p className="font-medium">💡 알아두세요!</p>
        <ul className="mt-1 text-xs space-y-0.5 text-yellow-600">
          <li>• 1명만 등록하면 지출 입력 시 자동으로 그 사람으로 저장돼요</li>
          <li>• 2명 이상 등록하면 매번 선택 드롭다운이 나타나요</li>
        </ul>
      </div>

      {/* 새 사람 추가 */}
      <div className="bg-white rounded-2xl shadow-soft p-4">
        <h3 className="text-sm font-medium text-gray-600 mb-3">새로 추가</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="이름 입력 (예: 나, 파트너)"
            className="flex-1 border border-pink-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-pink-400"
          />
          <button
            onClick={handleAdd}
            className="flex items-center gap-1.5 px-4 py-2 bg-pink-400 hover:bg-pink-500 text-white text-sm rounded-xl transition-colors"
          >
            <Plus size={15} />
            추가
          </button>
        </div>
      </div>

      {/* 등록된 사람 목록 */}
      <div className="bg-white rounded-2xl shadow-soft overflow-hidden">
        <div className="px-4 py-2.5 bg-pink-50 text-sm font-medium text-gray-600">
          등록된 사람 ({persons.length}명)
        </div>

        {persons.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-gray-400">
            <span className="text-4xl mb-2">🌷</span>
            <p className="text-sm">등록된 사람이 없어요</p>
            <p className="text-xs mt-1">위에서 이름을 추가해보세요!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {persons.map((person) => (
              <div key={person.id} className="px-4 py-3 flex items-center justify-between gap-2">
                {editingId === person.id ? (
                  // 편집 모드
                  <div className="flex items-center gap-2 flex-1 fade-in">
                    <input
                      autoFocus
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleUpdate(person.id);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      className="flex-1 border border-pink-300 rounded-lg px-2 py-1 text-sm focus:outline-none"
                    />
                    <button onClick={() => handleUpdate(person.id)} className="p-1 text-pink-500 hover:text-pink-700">
                      <Check size={16} />
                    </button>
                    <button onClick={() => setEditingId(null)} className="p-1 text-gray-400 hover:text-gray-600">
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  // 보기 모드
                  <>
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center text-sm text-pink-600 font-medium">
                        {person.name.charAt(0)}
                      </span>
                      <span className="text-sm text-gray-700">{person.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { setEditingId(person.id); setEditingName(person.name); }}
                        className="p-1.5 text-gray-300 hover:text-blue-400 transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                      {deleteConfirmId === person.id ? (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-red-500">삭제?</span>
                          <button onClick={() => handleDelete(person.id)} className="p-1 text-red-500 hover:text-red-700">
                            <Check size={14} />
                          </button>
                          <button onClick={() => setDeleteConfirmId(null)} className="p-1 text-gray-400">
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirmId(person.id)}
                          className="p-1.5 text-gray-300 hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
