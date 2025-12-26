import '../styles/globals.css'
import type { AppProps } from 'next/app'
import { ToastProvider } from '@roset/ui'
import { MDXProvider } from '@mdx-js/react'
import { MDXComponents } from '../components/MDXComponents'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <MDXProvider components={MDXComponents}>
      <ToastProvider>
        <Component {...pageProps} />
      </ToastProvider>
    </MDXProvider>
  )
}
