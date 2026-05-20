// ===================================================
// 클라우드 동기화 훅
// - 앱 시작 시: 서버에서 최신 데이터 불러와서 로컬에 반영
// - 데이터 변경 시: 1.5초 디바운스 후 서버에 저장
// ===================================================

'use client';

import { useEffect, useRef } from 'react';
import { useBudgetStore } from '@/lib/store';
import toast from 'react-hot-toast';

let saveTimer: ReturnType<typeof setTimeout> | null = null;

export function useCloudSync() {
  const store = useBudgetStore();
  const { expenses, categories, persons, replaceAll } = store;
  const initialLoadDone = useRef(false);
  const lastSavedRef = useRef<string>('');

  // ── 앱 시작 시 서버에서 불러오기 ─────────────────
  useEffect(() => {
    if (initialLoadDone.current) return;
    initialLoadDone.current = true;

    async function loadFromCloud() {
      try {
        const res = await fetch('/api/sync');
        if (!res.ok) return;
        const { data } = await res.json();
        if (!data) return; // 서버에 데이터 없으면 로컬 그대로 유지

        const { expenses: cloudExp, categories: cloudCats, persons: cloudPers } = data;

        // 서버 데이터가 더 최신인지 확인 (항목 수 기준)
        const localCount = useBudgetStore.getState().expenses.length;
        const cloudCount = (cloudExp ?? []).length;

        if (cloudCount > localCount) {
          replaceAll(cloudExp ?? [], cloudCats ?? [], cloudPers ?? []);
          toast.success('☁️ 클라우드에서 최신 데이터를 불러왔어요', { duration: 2000 });
        } else if (localCount > cloudCount && localCount > 0) {
          // 로컬이 더 많으면 로컬→클라우드로 업로드
          saveToCloud(useBudgetStore.getState());
        }
      } catch {
        // KV 미설정 시 조용히 무시 (localStorage만 사용)
      }
    }

    loadFromCloud();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 데이터 변경 시 디바운스 저장 ─────────────────
  useEffect(() => {
    if (!initialLoadDone.current) return;

    const snapshot = JSON.stringify({ expenses, categories, persons });
    if (snapshot === lastSavedRef.current) return; // 변경 없으면 스킵

    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveToCloud({ expenses, categories, persons });
      lastSavedRef.current = snapshot;
    }, 1500);

    return () => { if (saveTimer) clearTimeout(saveTimer); };
  }, [expenses, categories, persons]);
}

async function saveToCloud(data: { expenses: unknown; categories: unknown; persons: unknown }) {
  try {
    await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  } catch {
    // 저장 실패는 조용히 무시 (오프라인 등)
  }
}
