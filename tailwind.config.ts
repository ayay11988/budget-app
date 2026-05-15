import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // 파스텔 커스텀 색상 팔레트
      colors: {
        pastel: {
          pink: '#FFE4EC',
          'pink-dark': '#FFB3CB',
          'pink-text': '#C2185B',
          mint: '#D4F4E6',
          'mint-dark': '#A8E6CF',
          'mint-text': '#1B7A4E',
          cream: '#FFF8E7',
          'cream-dark': '#FFE9A0',
          'cream-text': '#7A5C00',
        },
      },
      // Noto Sans KR 폰트
      fontFamily: {
        sans: ['Noto Sans KR', 'sans-serif'],
      },
      // 부드러운 그림자
      boxShadow: {
        soft: '0 2px 8px rgba(0, 0, 0, 0.06)',
        card: '0 4px 16px rgba(0, 0, 0, 0.08)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
};

export default config;
