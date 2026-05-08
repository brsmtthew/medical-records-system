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
  UserCog,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import logo from "../assets/TGMCI_LOGO.png";
import { useAuth } from "../context/useAuth";

export default function Sidebar({
  isCollapsed = false,
  onToggleCollapse,
  onNavigate,
  onClose,
  showCloseButton = false,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin } = useAuth();
  // Defines the app sections used by both desktop and mobile navigation.
  const navItems = [
    { name: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
    { name: "Patients", icon: Users, path: "/patients" },
    { name: "Charts Station", icon: FileText, path: "/charts" },
    { name: "Chart Viewing", icon: FileSearch, path: "/chart-viewing" },
    { name: "Activity Logs", icon: BarChart3, path: "/reports" },
    ...(isAdmin ? [{ name: "Users", icon: UserCog, path: "/users" }] : []),
    { name: "Settings", icon: Settings, path: "/settings" },
  ];

  return (
    <div
      className={`mrs-sidebar min-h-screen text-slate-700 flex flex-col border-r shadow-xl shadow-slate-900/5 transition-all duration-300 ease-out ${
        isCollapsed ? "w-20 p-3 2xl:w-24 2xl:p-4" : "w-64 p-4 2xl:w-72 2xl:p-5"
      }`}
    >

      <div className={`mb-5 2xl:mb-8 flex gap-3 ${isCollapsed ? "flex-col items-center" : "items-center"}`}>
        <div className={`flex items-center min-w-0 ${isCollapsed ? "justify-center" : "w-full"}`}>
          <div
            className={`mrs-logo-frame shrink-0 rounded-lg border border-white/15 flex items-center justify-center shadow-xl shadow-slate-950/20 overflow-hidden transition-all duration-300 ${
              isCollapsed ? "h-11 w-11 p-1.5 2xl:h-12 2xl:w-12" : "h-16 w-full p-2.5 2xl:h-20 2xl:p-3"
            }`}
          >
            <img src={logo} alt="TGMCI" className="h-full w-full object-contain" />
          </div>
        </div>

        {showCloseButton && (
          <Motion.button
            whileHover={{ rotate: 90, scale: 1.03 }}
            whileTap={{ scale: 0.92 }}
            onClick={onClose}
            className="mrs-icon-button mrs-mobile-close-button ml-auto shrink-0"
            aria-label="Close menu"
          >
            <X size={18} />
          </Motion.button>
        )}
      </div>

      <nav className="flex-1 space-y-1 2xl:space-y-1.5">
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
                flex items-center rounded-lg cursor-pointer transition-all duration-300 ease-out group
                ${isCollapsed ? "justify-center px-0 py-2.5 2xl:py-3" : "gap-3 px-3 py-2.5 2xl:gap-4 2xl:px-4 2xl:py-3"}
                ${
                  isActive
                    ? "border border-cyan-100 bg-cyan-50 text-cyan-800 shadow-sm"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                }
              `}
            >
              <item.icon
                size={20}
                className={
                  isActive
                    ? "text-cyan-700"
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
                  className="ml-auto h-1.5 w-1.5 rounded-full bg-cyan-600"
                />
              )}
            </Motion.div>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-slate-100 pt-4 2xl:pt-6">
        {!showCloseButton && onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className={`hidden lg:flex items-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition-all duration-300 hover:border-cyan-200 hover:bg-cyan-50 hover:text-cyan-700 ${
              isCollapsed ? "mx-auto size-10 justify-center 2xl:size-11" : "w-full justify-between px-3 py-2.5"
            }`}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {!isCollapsed && <span className="text-[10px] font-black uppercase tracking-widest">Panel</span>}
            {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        )}
        {!isCollapsed && (
          <p className="mt-4 px-2 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
            Secured Records Workspace
          </p>
        )}
      </div>
    </div>
  );
}
