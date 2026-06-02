import { useState } from "react"

import EditorNavbar from "@/components/editor/editor-navbar"
import { cn } from "@/lib/utils"

function EditorLayout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  function handleToggleSidebar() {
    setIsSidebarOpen((open) => !open)
  }

  return (
    <div className="flex h-screen flex-col bg-neutral-950">
      <EditorNavbar
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={handleToggleSidebar} />

      <div className="flex flex-1 overflow-hidden">
        <aside
          aria-hidden={!isSidebarOpen}
          className={cn(
            "shrink-0 overflow-hidden border-r border-neutral-800 bg-neutral-950 text-neutral-300 transition-[width] duration-200 ease-in-out",
            isSidebarOpen ? "w-64" : "w-0"
          )} />

        <main className="flex-1 overflow-auto bg-background text-foreground">
          {children}
        </main>
      </div>
    </div>
  );
}

export default EditorLayout
