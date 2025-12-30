
import { useMDXComponents as getDocsMDXComponents } from 'nextra-theme-docs'
import { MDXComponents as CustomComponents } from './components/MDXComponents'

const themeComponents = getDocsMDXComponents()

// Merge: theme defaults < passed components < OUR custom overrides (highest priority)
export function useMDXComponents(components: any) {
  return {
    ...themeComponents,
    ...components,
    // Custom components LAST = highest priority override
    ...CustomComponents,
  }
}
