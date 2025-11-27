/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  eslint: {
    dirs: ['app', 'components', 'hooks', 'lib', 'types']
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      '@react-native-async-storage/async-storage': false
    };
    return config;
  }
};

module.exports = nextConfig;
