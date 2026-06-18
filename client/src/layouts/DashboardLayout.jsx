import React, { useState } from "react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

export default function DashboardLayout({ children }) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem("mrs-sidebar-collapsed") === "true";
    } catch {
      return false;
    }
  });

  // Persists the desktop sidebar width preference between page loads.
  const toggleSidebarCollapsed = () => {
    setIsSidebarCollapsed((value) => {
      const nextValue = !value;
      try {
        localStorage.setItem("mrs-sidebar-collapsed", String(nextValue));
      } catch {
        // Workstation browser policy can block localStorage; keep the UI state in memory.
      }
      return nextValue;
    });
  };

  return (
    <div className="mrs-shell mrs-deploy-fit relative flex h-dvh overflow-hidden font-sans">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[60] h-1 bg-[linear-gradient(90deg,#166534,#2563eb,#f59e0b)]" />
      <aside className="hidden h-full shrink-0 lg:block">
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={toggleSidebarCollapsed}
        />
      </aside>

      <AnimatePresence>
        {isMobileSidebarOpen && (
          <div className="fixed inset-0 z-[80] lg:hidden">
            <Motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileSidebarOpen(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <Motion.aside
              initial={{ x: -320, opacity: 0.95 }}
              animate={{ x: 0 }}
              exit={{ x: -320, opacity: 0.95 }}
              transition={{ type: "spring", stiffness: 280, damping: 32, mass: 0.9 }}
              className="relative z-10 h-full w-[min(20rem,88vw)]"
            >
              <Sidebar
                showCloseButton
                onClose={() => setIsMobileSidebarOpen(false)}
                onNavigate={() => setIsMobileSidebarOpen(false)}
              />
            </Motion.aside>
          </div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex min-w-0 flex-col relative overflow-hidden">
        <Navbar onMenuClick={() => setIsMobileSidebarOpen(true)} />

        <main className="flex-1 min-h-0 overflow-hidden relative">
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="mrs-main-content flex h-full min-h-0 flex-col overflow-hidden p-2.5 sm:p-3 md:p-4 2xl:p-5"
          >
            <div className="flex-1 min-h-0 overflow-hidden">{children}</div>
          </Motion.div>
        </main>
      </div>
    </div>
  );
}
