import { Terminal, MousePointer2, Globe, Link2, Zap, ArrowRight, Minus } from "lucide-react";
import { cursorMcpInstallDeeplink } from "../utils/promptLinks";
import { Button } from "./ui";
import { CodeBlock } from "./ui/CodeBlock";

export function InstallInCursor({ config }: { config?: any }) {
  const defaultConfig = {
    command: "npx",
    args: ["-y", "@roset/mcp-server"],
    env: {
       // Placeholder
    },
  };
  
  const finalConfig = config || defaultConfig;
  const link = cursorMcpInstallDeeplink("roset", finalConfig);

  return (
    <div className="my-8 relative group">
      {/* Subtle background field aura */}
      <div className="absolute inset-0 bg-accent/5 rounded-xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
      
      <div className="relative overflow-hidden bg-surface-1 border border-border rounded-xl transition-all hover:border-accent/40 shadow-sm">
        {/* Minimal header bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-surface-2 border-b border-border">
          <div className="flex items-center gap-2">
            <Zap className="text-accent w-3 h-3" />
            <span className="text-[10px] font-mono font-bold tracking-widest text-accent uppercase">
              Semantic Link / MCP
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1 h-1 rounded-full bg-success" />
            <span className="text-[9px] font-mono text-text-3 uppercase">Ready</span>
          </div>
        </div>

        <div className="p-6">
          <div className="flex flex-col md:flex-row md:items-center gap-8 justify-between">
            {/* Text Side */}
            <div className="flex flex-col gap-2 max-w-sm">
                <h3 className="text-lg font-bold text-text">
                  Direct Filesystem Access
                </h3>
                <p className="text-sm text-text-2 leading-relaxed">
                  Establish a protocol link between Cursor and Roset to enable AI-native 
                  semantics across your storage mounts.
                </p>
            </div>

            {/* Visual Center - Compact Resolution Line */}
            <div className="flex items-center gap-4 px-4 py-3 bg-black/20 rounded-lg border border-border/50">
               <div className="w-8 h-8 rounded-md bg-surface-2 border border-border flex items-center justify-center">
                  <MousePointer2 className="w-4 h-4 text-text-3" />
               </div>
               
               <div className="flex items-center relative w-16">
                  <div className="w-full h-[1px] bg-border relative">
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_8px_var(--accent)]" />
                  </div>
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded-full bg-accent/10 border border-accent/20">
                    <Link2 className="w-2.5 h-2.5 text-accent" />
                  </div>
               </div>

               <div className="w-8 h-8 rounded-md bg-surface-2 border border-border flex items-center justify-center">
                  <Globe className="w-4 h-4 text-accent" />
               </div>
            </div>

            {/* Action Box */}
            <div className="flex flex-col items-end gap-2 shrink-0">
               <Button asChild size="md" className="h-10 px-6 rounded-md bg-accent text-black font-bold hover:bg-accent-hover hover:scale-[1.02] transition-all shadow-[0_4px_12px_rgba(77,163,255,0.2)] border-none">
                  <a href={link} className="flex items-center gap-2 decoration-none">
                     Install in Cursor
                     <ArrowRight className="w-4 h-4" />
                  </a>
               </Button>
               <span className="text-[9px] font-mono text-text-3 uppercase">Cursor v0.40+</span>
            </div>
          </div>

          {/* Config Reveal - Minimalist */}
          <details className="group mt-6">
            <summary className="flex items-center gap-2 text-[10px] font-mono font-bold text-text-3 cursor-pointer hover:text-accent transition-all list-none outline-none">
               <Terminal className="w-3 h-3" />
               VIEW PAYLOAD
            </summary>
            <div className="mt-4 rounded-md overflow-hidden bg-black/40 border border-border/50">
              <CodeBlock 
                code={JSON.stringify(finalConfig, null, 2)} 
                language="json" 
                className="!m-0 !border-none !bg-transparent text-xs"
              />
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
