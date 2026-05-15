// ===================================================
// 대시보드: 월별 통계 카드 4개 (차트 포함)
// ===================================================

'use client';

import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  BarChart, Bar,
} from 'recharts';
import { useBudgetStore, getMonthExpenses } from '@/lib/store';
import { formatAmount, getPurposeEmoji, CHART_COLORS, PASTEL_PALETTE } from '@/lib/utils';
import { Expense } from '@/lib/types';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function Dashboard() {
  const { expenses, selectedYear, selectedMonth } = useBudgetStore();

  // 이번 달 지출
  const thisMonth = getMonthExpenses(expenses, selectedYear, selectedMonth);
  const thisTotal = thisMonth.reduce((s, e) => s + e.amount, 0);

  // 전월 지출
  const prevMonth = selectedMonth === 1
    ? getMonthExpenses(expenses, selectedYear - 1, 12)
    : getMonthExpenses(expenses, selectedYear, selectedMonth - 1);
  const prevTotal = prevTotal_calc(prevMonth);

  // 전월 대비 증감
  const diff = thisTotal - prevTotal;
  const diffPct = prevTotal > 0 ? Math.round((diff / prevTotal) * 100) : 0;

  // 사용목적별 집계
  const purposeData = ['생활용', '사업용', '개인용'].map((p) => ({
    name: `${getPurposeEmoji(p)} ${p}`,
    value: thisMonth.filter((e) => e.purpose === p).reduce((s, e) => s + e.amount, 0),
    color: CHART_COLORS[p as keyof typeof CHART_COLORS],
  })).filter((d) => d.value > 0);

  // 카테고리 TOP 5
  const catMap = new Map<string, number>();
  for (const e of thisMonth) {
    catMap.set(e.category, (catMap.get(e.category) || 0) + e.amount);
  }
  const topCategories = Array.from(catMap.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, value], i) => ({ name, value, color: PASTEL_PALETTE[i] }));

  // 일별 지출 추이
  const dayMap = new Map<number, number>();
  for (const e of thisMonth) {
    dayMap.set(e.day, (dayMap.get(e.day) || 0) + e.amount);
  }
  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const dailyData = Array.from({ length: daysInMonth }, (_, i) => ({
    day: `${i + 1}일`,
    amount: dayMap.get(i + 1) || 0,
  }));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 p-4">
      {/* 카드 1: 이번 달 총지출 */}
      <div className="bg-gradient-to-br from-[#FFE4EC] to-[#FFD0E0] rounded-2xl p-4 shadow-soft">
        <p className="text-sm text-pink-500 font-medium mb-1">💰 이번 달 총지출</p>
        <p className="text-2xl font-bold text-pink-800">{formatAmount(thisTotal)}</p>
        <div className="mt-2 flex items-center gap-1 text-sm">
          {diff === 0 ? (
            <><Minus size={14} className="text-gray-400" /><span className="text-gray-500">전월과 동일</span></>
          ) : diff > 0 ? (
            <><TrendingUp size={14} className="text-red-400" /><span className="text-red-500">전월 대비 +{diffPct}%</span></>
          ) : (
            <><TrendingDown size={14} className="text-green-500" /><span className="text-green-600">전월 대비 {diffPct}%</span></>
          )}
        </div>
        {prevTotal > 0 && (
          <p className="text-xs text-pink-400 mt-1">전월 {formatAmount(prevTotal)}</p>
        )}
      </div>

      {/* 카드 2: 사용목적별 도넛 차트 */}
      <div className="bg-gradient-to-br from-[#D4F4E6] to-[#B8EDD5] rounded-2xl p-4 shadow-soft">
        <p className="text-sm text-green-600 font-medium mb-2">🍩 사용목적별 비율</p>
        {purposeData.length === 0 ? (
          <p className="text-gray-400 text-sm mt-4">지출 내역이 없어요 🌿</p>
        ) : (
          <div className="flex items-center gap-2">
            <ResponsiveContainer width={90} height={90}>
              <PieChart>
                <Pie data={purposeData} cx="50%" cy="50%" innerRadius={25} outerRadius={40} dataKey="value" strokeWidth={0}>
                  {purposeData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatAmount(v)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-1 text-xs">
              {purposeData.map((d, i) => (
                <div key={i} className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                  <span className="text-gray-600">{d.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 카드 3: 카테고리 TOP 5 */}
      <div className="bg-gradient-to-br from-[#FFF8E7] to-[#FFE9A0] rounded-2xl p-4 shadow-soft">
        <p className="text-sm text-yellow-700 font-medium mb-2">🏆 카테고리 TOP 5</p>
        {topCategories.length === 0 ? (
          <p className="text-gray-400 text-sm mt-4">지출 내역이 없어요 🌻</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {topCategories.map((c, i) => (
              <div key={c.name} className="flex items-center gap-2">
                <span className="text-xs text-yellow-600 w-4 font-bold">{i + 1}</span>
                <div className="flex-1">
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className="text-gray-700 truncate max-w-[80px]">{c.name}</span>
                    <span className="text-gray-500">{formatAmount(c.value)}</span>
                  </div>
                  <div className="h-1.5 bg-yellow-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${topCategories[0].value ? (c.value / topCategories[0].value) * 100 : 0}%`,
                        background: c.color,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 카드 4: 일별 지출 추이 라인 차트 */}
      <div className="bg-gradient-to-br from-[#EDE9FE] to-[#DDD6FE] rounded-2xl p-4 shadow-soft">
        <p className="text-sm text-purple-600 font-medium mb-2">📈 일별 지출 추이</p>
        {thisTotal === 0 ? (
          <p className="text-gray-400 text-sm mt-4">지출 내역이 없어요 🌙</p>
        ) : (
          <ResponsiveContainer width="100%" height={80}>
            <LineChart data={dailyData} margin={{ top: 4, right: 4, left: -30, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E9D5FF" />
              <XAxis dataKey="day" tick={{ fontSize: 9 }} interval={4} />
              <YAxis tick={{ fontSize: 9 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
              <Tooltip
                formatter={(v: number) => [formatAmount(v), '지출']}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #DDD6FE' }}
              />
              <Line type="monotone" dataKey="amount" stroke="#A78BFA" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function prevTotal_calc(expenses: Expense[]): number {
  return expenses.reduce((s, e) => s + e.amount, 0);
}
