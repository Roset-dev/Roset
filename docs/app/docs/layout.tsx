import { SiteTitle } from "@/components/site-title";
import { Sidebar } from "@/components/sidebar";
import { TableOfContents } from "@/components/toc";
import { ThemeToggle } from "@/components/theme-toggle";
import { MobileSidebarToggle } from "@/components/mobile-sidebar";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { EditLink } from "@/components/edit-link";
import { Pagination } from "@/components/pagination";
import { SearchTrigger, SearchDialog } from "@/components/search";
import { SdkPreferenceProvider } from "@/lib/sdk-preference";
import { SdkSelector } from "@/components/sdk-selector";

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SdkPreferenceProvider>
      <div className="min-h-screen">
        {/* Skip to content — accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:bg-primary focus:text-white focus:px-4 focus:py-2 focus:rounded-md focus:text-sm"
        >
          Skip to content
        </a>

        {/* Header */}
        <header className="fixed top-0 left-0 right-0 h-14 flex items-center bg-header-bg backdrop-blur-xl z-50">
          <div className="flex items-center justify-center gap-3 px-4 lg:w-[260px] lg:shrink-0 lg:border-r lg:border-border lg:bg-sidebar-bg h-full">
            <MobileSidebarToggle />
            <SiteTitle />
          </div>
          <div className="flex items-center justify-between flex-1 px-4 lg:px-6 border-b border-border h-full">
            <SearchTrigger />
            <ThemeToggle />
          </div>
        </header>

        {/* Left Sidebar */}
        <aside
          aria-label="Documentation navigation"
          className="hidden lg:flex flex-col fixed top-14 left-0 w-[260px] h-[calc(100vh-3.5rem)] bg-sidebar-bg border-r border-border z-40"
        >
          <div className="flex-1 overflow-y-auto px-3 pb-8">
            <div className="sticky top-0 z-10 -mx-3 h-5 bg-gradient-to-b from-sidebar-bg to-transparent pointer-events-none" />
            <SdkSelector />
            <Sidebar />
          </div>
        </aside>

        {/* Main area */}
        <div className="lg:ml-[260px] xl:mr-[220px] pt-14 flex">
          <main id="main-content" className="flex-1 min-w-0">
            <div className="max-w-[740px] mx-auto px-6 py-10 lg:px-10">
              <Breadcrumbs />
              <article className="docs-content">{children}</article>
              <EditLink />
              <Pagination />
            </div>
          </main>

          {/* Right TOC */}
          <aside
            aria-label="Table of contents"
            className="hidden xl:block fixed top-14 right-0 w-[220px] h-[calc(100vh-3.5rem)] overflow-y-auto py-8 px-5"
          >
            <TableOfContents />
          </aside>
        </div>

        <SearchDialog />
      </div>
    </SdkPreferenceProvider>
  );
}
