import React, { useState } from "react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

export default function DashboardLayout({ children }) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem("mrs-sidebar-collapsed") === "true";
  });

  const toggleSidebarCollapsed = () => {
    setIsSidebarCollapsed((value) => {
      const nextValue = !value;
      localStorage.setItem("mrs-sidebar-collapsed", String(nextValue));
      return nextValue;
    });
  };

  return (
    <div className="mrs-shell mrs-deploy-fit flex min-h-dvh overflow-x-hidden font-sans lg:h-screen lg:overflow-hidden">
      <aside className="hidden lg:block shrink-0">
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
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
              className="relative z-10 h-full max-w-[85vw]"
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

        <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden relative lg:overflow-hidden">
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="min-h-full p-4 md:p-5 2xl:p-6 flex flex-col overflow-visible lg:h-full lg:min-h-0 lg:overflow-hidden"
          >
            <div className="flex-1 min-h-0 overflow-visible lg:overflow-hidden">{children}</div>
          </Motion.div>
        </main>
      </div>
    </div>
  );
}
