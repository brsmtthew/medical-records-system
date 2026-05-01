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
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* SIDEBAR - Fixed width, non-scrolling */}
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
              className="relative z-10 h-full"
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

      {/* MAIN CONTENT WRAPPER */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        
        {/* NAVBAR - Sticky at the top */}
        <Navbar onMenuClick={() => setIsMobileSidebarOpen(true)} />

        {/* SCROLLABLE CONTENT AREA */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden relative bg-[#F8FAFC]">
          
          {/* Decorative subtle glow in the top corner */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-green-100/30 rounded-full blur-3xl pointer-events-none -z-10 translate-x-1/2 -translate-y-1/2" />

          <Motion.div
            /* Page Transition: Slide up and Fade in */
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="p-4 md:p-5 min-h-full flex flex-col"
          >
            {/* Main Page Content */}
            <div className="flex-1">
              {children}
            </div>

            {/* SYSTEM FOOTER */}
            <footer className="mt-12 pt-6 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
                <span>© 2026 TGMCI Medical Systems</span>
                <span className="text-slate-200">|</span>
                <a href="#" className="hover:text-green-600 transition-colors">Privacy Policy</a>
                <span className="text-slate-200">|</span>
                <a href="#" className="hover:text-green-600 transition-colors">Support</a>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">
                  System Encrypted & Secure
                </span>
              </div>
            </footer>
          </Motion.div>
        </main>
      </div>
    </div>
  );
}
