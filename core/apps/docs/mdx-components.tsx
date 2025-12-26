
import { useMDXComponents as getDocsMDXComponents } from 'nextra-theme-docs'
import { MDXComponents as CustomComponents } from './components/MDXComponents'

const themeComponents = getDocsMDXComponents()

// Merge default theme components with our custom ones
export function useMDXComponents(components: any) {
  return {
    ...themeComponents,
    ...components,
    ...CustomComponents
  }
}
