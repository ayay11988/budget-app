/** @type {import('next').NextConfig} */
const nextConfig = {
  // 엑셀 파일 처리를 위한 webpack 설정
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
};

export default nextConfig;
