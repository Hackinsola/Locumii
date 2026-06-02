import { PanelLeftClose, PanelLeftOpen } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

function EditorNavbar({ isSidebarOpen = false, onToggleSidebar, className }) {
  const ToggleIcon = isSidebarOpen ? PanelLeftClose : PanelLeftOpen

  return (
    <header
      className={cn(
        "flex h-14 shrink-0 items-center justify-between border-b border-neutral-800 bg-neutral-950 px-4 text-neutral-50",
        className
      )}>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
          aria-pressed={isSidebarOpen}
          onClick={onToggleSidebar}
          className="text-neutral-300 hover:bg-white/10 hover:text-neutral-50">
          <ToggleIcon />
        </Button>
      </div>

      <div className="flex flex-1 items-center justify-center" />

      <div className="flex items-center gap-2" />
    </header>
  );
}

export default EditorNavbar
