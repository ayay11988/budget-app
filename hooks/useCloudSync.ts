// ===================================================
// 클라우드 동기화 훅 (Vercel KV)
// ===================================================

'use client';

import { useEffect, useRef, useState } from 'react';
import { useBudgetStore } from '@/lib/store';
import toast from 'react-hot-toast';

let saveTimer: ReturnType<typeof setTimeout> | null = null;

export type SyncStatus = 'idle' | 'loading' | 'saving' | 'ok' | 'error' | 'no-kv';

// 전역으로 상태 공유 (헤더에서 표시용)
let statusListeners: ((s: SyncStatus) => void)[] = [];
let currentStatus: SyncStatus = 'idle';
function setStatus(s: SyncStatus) {
  currentStatus = s;
  statusListeners.forEach((fn) => fn(s));
}
export function useSyncStatus() {
  const [status, setLocalStatus] = useState<SyncStatus>(currentStatus);
  useEffect(() => {
    statusListeners.push(setLocalStatus);
    return () => { statusListeners = statusListeners.filter((f) => f !== setLocalStatus); };
  }, []);
  return status;
}

export async function triggerCloudLoad(): Promise<boolean> {
  setStatus('loading');
  try {
    const res = await fetch('/api/sync', { cache: 'no-store' });
    const json = await res.json();

    if (!res.ok) {
      if (json?.noKv) {
        setStatus('no-kv');
        toast.error('Vercel Blob이 연결되지 않았어요. Vercel 대시보드에서 Blob 설정을 완료해주세요.', { duration: 5000 });
      } else {
        setStatus('error');
        toast.error('☁️ 클라우드 연결 오류: ' + (json?.error ?? '알 수 없는 오류'));
      }
      return false;
    }

    const { data } = json;
    const cloudExp = data?.expenses ?? [];
    const cloudCats = data?.categories ?? [];
    const cloudPers = data?.persons ?? [];
    const cloudCount = cloudExp.length;

    const state = useBudgetStore.getState();
    const localCount = state.expenses.length;

    if (cloudCount === 0) {
      // 클라우드가 비어있고 로컬에 데이터가 있으면 → 업로드
      if (localCount > 0) {
        setStatus('saving');
        await saveToCloud({ expenses: state.expenses, categories: state.categories, persons: state.persons });
        setStatus('ok');
        toast.success(`☁️ ${localCount}개 항목을 클라우드에 저장했어요!`, { duration: 3000 });
      } else {
        setStatus('ok');
        toast('☁️ 클라우드와 로컬 모두 데이터가 없어요', { icon: '💭', duration: 2000 });
      }
      return false;
    }

    if (cloudCount >= localCount) {
      useBudgetStore.getState().replaceAll(cloudExp, cloudCats, cloudPers);
      setStatus('ok');
      toast.success(`☁️ ${cloudCount}개 항목을 클라우드에서 불러왔어요!`, { duration: 3000 });
      return true;
    } else {
      // 로컬이 더 많음 → 클라우드에 업로드
      setStatus('saving');
      await saveToCloud({ expenses: state.expenses, categories: state.categories, persons: state.persons });
      setStatus('ok');
      toast.success(`☁️ ${localCount}개 항목을 클라우드에 저장했어요!`, { duration: 3000 });
      return false;
    }
  } catch (err) {
    console.error('[cloudSync load]', err);
    setStatus('error');
    toast.error('☁️ 클라우드 불러오기 실패');
    return false;
  }
}

export function useCloudSync() {
  const { expenses, categories, persons } = useBudgetStore();
  const initialLoadDone = useRef(false);
  const lastSavedRef = useRef<string>('');

  // ── 앱 시작 시 서버에서 불러오기 ──────────────────
  useEffect(() => {
    if (initialLoadDone.current) return;
    initialLoadDone.current = true;

    const localCount = useBudgetStore.getState().expenses.length;

    async function loadFromCloud() {
      setStatus('loading');
      try {
        const res = await fetch('/api/sync', { cache: 'no-store' });
        const json = await res.json();

        if (!res.ok) {
          setStatus(json?.noKv ? 'no-kv' : 'error');
          return;
        }

        const { data } = json;
        if (!data) { setStatus('ok'); return; }

        const { expenses: cloudExp, categories: cloudCats, persons: cloudPers } = data;
        const cloudCount = (cloudExp ?? []).length;

        if (cloudCount > localCount) {
          // 클라우드가 더 최신 → 덮어씀
          useBudgetStore.getState().replaceAll(cloudExp ?? [], cloudCats ?? [], cloudPers ?? []);
          setStatus('ok');
          toast.success(`☁️ 클라우드에서 ${cloudCount}개 항목을 불러왔어요`, { duration: 3000 });
          lastSavedRef.current = JSON.stringify({ expenses: cloudExp, categories: cloudCats, persons: cloudPers });
        } else if (localCount > 0) {
          // 로컬이 더 많거나 같음 → 클라우드에 업로드
          await saveToCloud({ expenses, categories, persons });
          setStatus('ok');
        } else {
          setStatus('ok');
        }
      } catch (err) {
        console.error('[cloudSync]', err);
        setStatus('error');
      }
    }

    loadFromCloud();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 데이터 변경 시 디바운스 저장 ──────────────────
  useEffect(() => {
    if (!initialLoadDone.current) return;

    const snapshot = JSON.stringify({ expenses, categories, persons });
    if (snapshot === lastSavedRef.current) return;

    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      setStatus('saving');
      await saveToCloud({ expenses, categories, persons });
      lastSavedRef.current = snapshot;
      setStatus('ok');
    }, 1500);

    return () => { if (saveTimer) clearTimeout(saveTimer); };
  }, [expenses, categories, persons]);
}

export async function saveToCloud(data: { expenses: unknown; categories: unknown; persons: unknown }) {
  try {
    await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  } catch {
    // 오프라인 등 — 조용히 무시
  }
}
