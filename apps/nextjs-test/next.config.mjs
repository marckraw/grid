/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@mrck-labs/grid-core', '@mrck-labs/grid-agents'],
  experimental: {
    // Fix for Next.js 14.2.5 build error: ENOENT for _app.js.nft.json
    // This happens when Next.js tries to collect build traces but the NFT (Node File Trace) 
    // files don't exist in the app directory structure. This is a known issue with Next.js
    // when using the app directory without a pages/_app.js file.
    // The error appears during "Collecting build traces" phase after successful compilation.
    // This config tells Next.js to skip tracing these non-existent files.
    // Can be removed when upgrading to Next.js 15+ where this is fixed.
    outputFileTracingExcludes: {
      '*': ['**/_app.js.nft.json'],
    },
  },
}

export default nextConfig