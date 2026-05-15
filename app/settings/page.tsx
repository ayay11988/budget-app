// ===================================================
// 설정 페이지 - 사람 관리 / 카테고리 관리
// ===================================================

'use client';

import { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import Link from 'next/link';
import PersonManager from '@/components/PersonManager';
import CategoryManager from '@/components/CategoryManager';
import { ArrowLeft } from 'lucide-react';

type Tab = 'person' | 'category';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('person');

  return (
    <div className="min-h-screen bg-[#FFF8F9]">
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            fontFamily: 'Noto Sans KR, sans-serif',
            borderRadius: '12px',
          },
        }}
      />

      {/* 헤더 */}
      <header className="bg-white border-b border-pink-100 px-4 py-3 flex items-center gap-3 sticky top-0 z-40 shadow-soft">
        <Link href="/" className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-base font-bold text-pink-700">⚙️ 설정</h1>
      </header>

      {/* 탭 */}
      <div className="bg-white border-b border-pink-100">
        <div className="flex gap-1 px-4 py-2">
          <button
            onClick={() => setActiveTab('person')}
            className={`px-4 py-2 text-sm rounded-xl transition-colors ${
              activeTab === 'person'
                ? 'bg-pink-400 text-white font-medium'
                : 'text-gray-500 hover:bg-pink-50'
            }`}
          >
            👤 사람 관리
          </button>
          <button
            onClick={() => setActiveTab('category')}
            className={`px-4 py-2 text-sm rounded-xl transition-colors ${
              activeTab === 'category'
                ? 'bg-pink-400 text-white font-medium'
                : 'text-gray-500 hover:bg-pink-50'
            }`}
          >
            🗂️ 카테고리 관리
          </button>
        </div>
      </div>

      {/* 컨텐츠 */}
      <main className="max-w-3xl mx-auto p-4">
        {activeTab === 'person' ? (
          <div className="fade-in">
            <PersonManager />
          </div>
        ) : (
          <div className="fade-in">
            <CategoryManager />
          </div>
        )}
      </main>
    </div>
  );
}
