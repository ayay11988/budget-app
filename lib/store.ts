// ===================================================
// Zustand 전역 상태 관리 스토어
// localStorage에 자동 저장되어 새로고침해도 데이터 유지
// ===================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Expense, Category, Person, Filter, AppSettings } from './types';
import { SEED_CATEGORIES, SEED_CATEGORY_DATA } from './seed-categories';
import { generateId, getCurrentYearMonth } from './utils';

/** 기존 카테고리 목록에 새로 추가된 기본 카테고리를 병합 (이름 기준 중복 제외) */
function mergeSeedCategories(existing: Category[]): Category[] {
  const existingNames = new Set(existing.map((c) => c.name));
  const missing = SEED_CATEGORY_DATA
    .filter((s) => !existingNames.has(s.name))
    .map((s) => ({ ...s, id: generateId() }));
  return missing.length > 0 ? [...existing, ...missing] : existing;
}

interface BudgetStore {
  // ── 핵심 데이터 ──────────────────────────────────
  expenses: Expense[];
  categories: Category[];
  persons: Person[];
  settings: AppSettings;

  // ── UI 상태 ──────────────────────────────────────
  selectedYear: number;
  selectedMonth: number;
  filter: Filter;

  // ── 지출 CRUD ────────────────────────────────────
  addExpense: (expense: Omit<Expense, 'id' | 'createdAt'>) => void;
  addExpenses: (expenses: Omit<Expense, 'id' | 'createdAt'>[]) => void;
  updateExpense: (id: string, updates: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;
  deleteExpenses: (ids: string[]) => void;  // 일괄 삭제

  // ── 카테고리 CRUD ────────────────────────────────
  addCategory: (category: Omit<Category, 'id'>) => void;
  updateCategory: (id: string, updates: Partial<Category>) => void;
  deleteCategory: (id: string) => void;

  // ── 사람 CRUD ────────────────────────────────────
  addPerson: (name: string) => void;
  updatePerson: (id: string, name: string) => void;
  deletePerson: (id: string) => void;

  // ── 월별 탭 ──────────────────────────────────────
  setSelectedMonth: (year: number, month: number) => void;

  // ── 필터 ─────────────────────────────────────────
  setFilter: (filter: Partial<Filter>) => void;
  resetFilter: () => void;

  // ── 설정 ─────────────────────────────────────────
  setInitialized: () => void;

  // ── 엑셀 불러오기 ────────────────────────────────
  replaceAll: (expenses: Expense[], categories: Category[], persons: Person[]) => void;
  mergeExpenses: (newExpenses: Expense[], newCategories?: Category[], newPersons?: Person[]) => void;
}

const DEFAULT_FILTER: Filter = {
  purposes: [],
  categories: [],
  persons: [],
  paymentMethods: [],
  dateFrom: '',
  dateTo: '',
  amountMin: null,
  amountMax: null,
  searchText: '',
};

const { year, month } = getCurrentYearMonth();

export const useBudgetStore = create<BudgetStore>()(
  persist(
    (set) => ({
      // 초기 데이터
      expenses: [],
      categories: SEED_CATEGORIES,
      persons: [],
      settings: { hasInitialized: false },
      selectedYear: year,
      selectedMonth: month,
      filter: DEFAULT_FILTER,

      // ── 지출 CRUD ──────────────────────────────
      addExpense: (expense) =>
        set((state) => ({
          expenses: [
            ...state.expenses,
            { ...expense, id: generateId(), createdAt: new Date().toISOString() },
          ],
        })),

      addExpenses: (expenses) =>
        set((state) => ({
          expenses: [
            ...state.expenses,
            ...expenses.map((e) => ({
              ...e,
              id: generateId(),
              createdAt: new Date().toISOString(),
            })),
          ],
        })),

      updateExpense: (id, updates) =>
        set((state) => ({
          expenses: state.expenses.map((e) => (e.id === id ? { ...e, ...updates } : e)),
        })),

      deleteExpense: (id) =>
        set((state) => ({
          expenses: state.expenses.filter((e) => e.id !== id),
        })),

      deleteExpenses: (ids) =>
        set((state) => ({
          expenses: state.expenses.filter((e) => !ids.includes(e.id)),
        })),

      // ── 카테고리 CRUD ──────────────────────────
      addCategory: (category) =>
        set((state) => ({
          categories: [...state.categories, { ...category, id: generateId() }],
        })),

      updateCategory: (id, updates) =>
        set((state) => ({
          categories: state.categories.map((c) => (c.id === id ? { ...c, ...updates } : c)),
        })),

      deleteCategory: (id) =>
        set((state) => ({
          categories: state.categories.filter((c) => c.id !== id),
        })),

      // ── 사람 CRUD ──────────────────────────────
      addPerson: (name) =>
        set((state) => ({
          persons: [...state.persons, { id: generateId(), name }],
        })),

      updatePerson: (id, name) =>
        set((state) => ({
          persons: state.persons.map((p) => (p.id === id ? { ...p, name } : p)),
        })),

      deletePerson: (id) =>
        set((state) => ({
          persons: state.persons.filter((p) => p.id !== id),
        })),

      // ── 월별 탭 ────────────────────────────────
      setSelectedMonth: (year, month) => set({ selectedYear: year, selectedMonth: month }),

      // ── 필터 ───────────────────────────────────
      setFilter: (filter) =>
        set((state) => ({ filter: { ...state.filter, ...filter } })),

      resetFilter: () => set({ filter: DEFAULT_FILTER }),

      // ── 설정 ───────────────────────────────────
      setInitialized: () =>
        set((state) => ({ settings: { ...state.settings, hasInitialized: true } })),

      // ── 엑셀 불러오기 ──────────────────────────
      replaceAll: (expenses, categories, persons) =>
        set({ expenses, categories, persons }),

      mergeExpenses: (newExpenses, newCategories, newPersons) =>
        set((state) => {
          // 날짜+내역+금액 조합이 같으면 중복으로 판단하고 스킵
          const existingKeys = new Set(
            state.expenses.map((e) => `${e.date}-${e.item}-${e.amount}`)
          );
          const filtered = newExpenses.filter(
            (e) => !existingKeys.has(`${e.date}-${e.item}-${e.amount}`)
          );

          // 카테고리 병합: 이름이 같으면 스킵
          const existingCatNames = new Set(state.categories.map((c) => c.name));
          const newCats = (newCategories ?? []).filter((c) => !existingCatNames.has(c.name));

          // 사람 병합: 이름이 같으면 스킵
          const existingPersonNames = new Set(state.persons.map((p) => p.name));
          const newPers = (newPersons ?? []).filter((p) => !existingPersonNames.has(p.name));

          return {
            expenses: [...state.expenses, ...filtered],
            categories: [...state.categories, ...newCats],
            persons: [...state.persons, ...newPers],
          };
        }),
    }),
    {
      name: 'budget-storage',
      // 앱 로드 시 새로 추가된 기본 카테고리 자동 병합
      onRehydrateStorage: () => (state) => {
        if (state) {
          const merged = mergeSeedCategories(state.categories);
          if (merged.length !== state.categories.length) {
            state.categories = merged;
          }
        }
      },
    }
  )
);

// ── 자주 쓰는 파생 셀렉터 ──────────────────────────────

/** 현재 선택된 월의 지출 목록 (날짜 오름차순) */
export function getMonthExpenses(
  expenses: Expense[],
  year: number,
  month: number
): Expense[] {
  return expenses
    .filter((e) => e.year === year && e.month === month)
    .sort((a, b) => a.day - b.day || a.createdAt.localeCompare(b.createdAt));
}

/** 필터를 적용한 지출 목록 */
export function applyFilter(expenses: Expense[], filter: Filter): Expense[] {
  return expenses.filter((e) => {
    if (filter.purposes.length > 0 && !filter.purposes.includes(e.purpose)) return false;
    if (filter.categories.length > 0 && !filter.categories.includes(e.category)) return false;
    if (filter.persons.length > 0 && !filter.persons.includes(e.person)) return false;
    if (filter.paymentMethods.length > 0 && !filter.paymentMethods.includes(e.paymentMethod))
      return false;
    if (filter.amountMin !== null && e.amount < filter.amountMin) return false;
    if (filter.amountMax !== null && e.amount > filter.amountMax) return false;
    if (filter.searchText) {
      const text = filter.searchText.toLowerCase();
      if (
        !e.item.toLowerCase().includes(text) &&
        !e.place.toLowerCase().includes(text) &&
        !e.memo.toLowerCase().includes(text)
      )
        return false;
    }
    return true;
  });
}

/** 모든 지출에서 사용된 연월 목록 (탭용) */
export function getAvailableMonths(
  expenses: Expense[]
): { year: number; month: number; label: string; total: number }[] {
  const map = new Map<string, { year: number; month: number; total: number }>();
  for (const e of expenses) {
    const key = `${e.year}-${String(e.month).padStart(2, '0')}`;
    const existing = map.get(key);
    if (existing) {
      existing.total += e.amount;
    } else {
      map.set(key, { year: e.year, month: e.month, total: e.amount });
    }
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => ({ ...v, label: `${v.year}년 ${v.month}월` }));
}
