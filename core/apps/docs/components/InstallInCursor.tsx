import { Terminal, ChevronDown } from "lucide-react";
import { cursorMcpInstallDeeplink } from "../utils/promptLinks";
import { Button } from "./ui";
import { CodeBlock } from "./ui/CodeBlock";

export function InstallInCursor({ config }: { config?: any }) {
  const defaultConfig = {
    command: "npx",
    args: ["-y", "@roset/mcp-server"],
    env: {
       // Placeholder, users might need to add their own env vars
    },
  };
  
  const finalConfig = config || defaultConfig;
  const link = cursorMcpInstallDeeplink("roset", finalConfig);

  return (
    <div className="my-8 p-6 bg-surface border border-border rounded-xl shadow-sm">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Terminal className="text-primary w-5 h-5" />
          <h4 className="text-sm font-semibold tracking-tight">CURSOR MCP INTEGRATION</h4>
        </div>
        
        <div className="space-y-3">
          <Button asChild size="lg" className="w-fit">
              <a href={link} className="flex items-center gap-2">
                 Install in Cursor
              </a>
          </Button>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-md">
              Establish a direct protocol link between Cursor and Roset. This enables AI-native 
              filesystem semantics across your object storage mounts.
          </p>
        </div>

        <details className="group mt-6 border-t border-border pt-4">
          <summary className="flex items-center gap-2 text-[10px] font-mono font-bold text-secondary-foreground cursor-pointer hover:text-primary transition-all list-none outline-none">
            <span className="flex items-center justify-center w-4 h-4 rounded bg-muted group-hover:bg-primary/10 transition-colors">
              <ChevronDown className="w-3 h-3 transition-transform group-open:rotate-180" />
            </span>
            VIEW CONFIGURATION PAYLOAD
          </summary>
          <div className="mt-4 rounded-lg overflow-hidden border border-border/50">
            <CodeBlock 
              code={JSON.stringify(finalConfig, null, 2)} 
              language="json" 
              className="m-0 border-none rounded-none"
            />
          </div>
        </details>
      </div>
    </div>
  );
}
