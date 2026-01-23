/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@myremote/shared'],
  output: 'standalone',
}

module.exports = nextConfig
