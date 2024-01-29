const { i18n } = require('./next-i18next.config');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  basePath: process.env.NODE_ENV === 'production' ? '/picktime' : '',
  assetPrefix: process.env.NODE_ENV === 'production' ? '/picktime' : '',
  optimizeFonts: false,
  i18n
};

module.exports = nextConfig;
