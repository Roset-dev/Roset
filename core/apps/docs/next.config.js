const withNextra = require('nextra')({
  theme: 'nextra-theme-docs',
  themeConfig: './theme.config.tsx',
  // Disable Nextra's built-in Shiki syntax highlighting
  // This allows our custom CodeBlock component to handle all code blocks
  codeHighlight: false,
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [],
  
  // Redirects from old Mintlify URLs
  async redirects() {
    return [
      // Add redirects from old Mintlify routes if needed
      // Example:
      // { source: '/old-path', destination: '/new-path', permanent: true },
    ]
  },

  // SEO headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ]
  },
}

module.exports = withNextra(nextConfig)
