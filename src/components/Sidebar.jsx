import React from "react";
import { motion as Motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  FileText,
  FileSearch,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import logo from "../assets/TGMCI_LOGO.png";

export default function Sidebar({
  isCollapsed = false,
  onToggleCollapse,
  onNavigate,
  onClose,
  showCloseButton = false,
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { name: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
    { name: "Patients", icon: Users, path: "/patients" },
    { name: "Charts Station", icon: FileText, path: "/charts" },
    { name: "Chart Viewing", icon: FileSearch, path: "/chart-viewing" },
    { name: "Reports", icon: BarChart3, path: "/reports" },
    { name: "Settings", icon: Settings, path: "/settings" },
  ];

  return (
    <div
      className={`mrs-sidebar min-h-screen bg-gradient-to-b from-blue-50 via-white to-green-50/70 text-slate-700 flex flex-col border-r border-blue-100 shadow-xl shadow-slate-900/5 transition-all duration-300 ease-out ${
        isCollapsed ? "w-24 p-4" : "w-72 p-5"
      }`}
    >

      <div className={`mb-8 flex gap-3 ${isCollapsed ? "flex-col items-center" : "items-center"}`}>
        <div className={`flex items-center min-w-0 ${isCollapsed ? "justify-center" : "w-full"}`}>
          <div
            className={`mrs-logo-frame shrink-0 rounded-2xl border border-slate-200 flex items-center justify-center shadow-sm overflow-hidden transition-all duration-300 ${
              isCollapsed ? "h-12 w-12 p-1.5" : "h-20 w-full p-3"
            }`}
          >
            <img src={logo} alt="TGMCI" className="h-full w-full object-contain" />
          </div>
        </div>

        {showCloseButton && (
          <button
            onClick={onClose}
            className="ml-auto p-2 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-1.5">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;

          return (
            <Motion.div
              key={item.name}
              onClick={() => {
                navigate(item.path);
                onNavigate?.();
              }}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
              title={isCollapsed ? item.name : undefined}
              className={`
                flex items-center rounded-xl cursor-pointer transition-all duration-300 ease-out group
                ${isCollapsed ? "justify-center px-0 py-3" : "gap-4 px-4 py-3"}
                ${
                  isActive
                    ? "bg-blue-50 text-blue-700 shadow-sm"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                }
              `}
            >
              <item.icon
                size={20}
                className={
                  isActive
                    ? "text-blue-700"
                    : "text-slate-400 group-hover:text-slate-700"
                }
              />

              {!isCollapsed && (
                <span className="font-bold text-sm tracking-wide">
                  {item.name}
                </span>
              )}

              {isActive && !isCollapsed && (
                <Motion.div
                  layoutId="activeIndicator"
                  className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600"
                />
              )}
            </Motion.div>
          );
        })}
      </nav>

      <div className="mt-auto pt-6 border-t border-slate-100">
        {!showCloseButton && onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className={`hidden lg:flex items-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-all duration-300 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 ${
              isCollapsed ? "mx-auto size-11 justify-center" : "w-full justify-between px-3 py-2.5"
            }`}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {!isCollapsed && <span className="text-[10px] font-black uppercase tracking-widest">Panel</span>}
            {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        )}
        {!isCollapsed && (
          <p className="mt-4 px-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            Secured Records Workspace
          </p>
        )}
      </div>
    </div>
  );
}
