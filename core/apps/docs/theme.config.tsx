import React from 'react'
import { DocsThemeConfig } from 'nextra-theme-docs'
import { MDXComponents } from './components/MDXComponents'

const config: DocsThemeConfig = {
  logo: (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <img src="/logos/logo-white-no-bg.png" alt="Roset Logo" width="24" height="24" />
      <span style={{ fontWeight: 700, fontSize: '1.25rem' }}>Roset</span>
    </div>
  ),
  project: {
    link: 'https://github.com/Roset-dev/roset',
  },
  chat: {
    link: 'https://discord.gg/roset',
  },
  docsRepositoryBase: 'https://github.com/Roset-dev/roset/tree/main/core/apps/docs',
  footer: {
    text: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img src="/logos/logo-white-no-bg.png" alt="Roset Logo" width="16" height="16" />
          <span style={{ fontWeight: 600 }}>Roset</span>
        </div>
        <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', opacity: 0.5 }}>
          © {new Date().getFullYear()} THE FIELD RESOLUTION CORE. ALL RIGHTS RESERVED.
        </span>
      </div>
    ),
  },
  head: (
    <>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta property="og:title" content="Roset Docs" />
      <meta property="og:description" content="The metadata-first control plane for object storage" />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="Roset Docs" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@roset_dev" />
      <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    </>
  ),
  useNextSeoProps() {
    return {
      titleTemplate: '%s – Roset Docs',
      description: 'The metadata-first control plane for object storage',
      openGraph: {
        siteName: 'Roset Docs',
      },
    }
  },
  primaryHue: 210,
  primarySaturation: 100,
  sidebar: {
    defaultMenuCollapseLevel: 1,
    toggleButton: true,
  },
  toc: {
    float: true,
    title: 'On This Page',
  },
  editLink: {
    text: 'Edit this page on GitHub →',
  },
  navigation: {
    prev: true,
    next: true,
  },
  search: {
    placeholder: 'Search documentation...',
  },
  darkMode: true,
  nextThemes: {
    defaultTheme: 'dark',
  },
  components: MDXComponents,
}

export default config
