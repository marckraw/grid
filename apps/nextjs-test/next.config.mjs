/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@mrck-labs/grid-core', '@mrck-labs/grid-agents'],
  experimental: {
    outputFileTracingExcludes: {
      '*': ['**/_app.js.nft.json'],
    },
  },
}

export default nextConfig