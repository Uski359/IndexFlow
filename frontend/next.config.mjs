/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    appDir: true
  },
  eslint: {
    dirs: ['src']
  }
};

export default nextConfig;
