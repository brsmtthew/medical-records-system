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
  PanelLeftClose,
  PanelLeftOpen,
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
    { name: "Dashboard", icon: LayoutDashboard, path: "/admin" },
    { name: "Patients", icon: Users, path: "/patients" },
    { name: "Charts Station", icon: FileText, path: "/charts" },
    { name: "Chart Viewing", icon: FileSearch, path: "/chart-viewing" },
    { name: "Reports", icon: BarChart3, path: "/reports" },
    { name: "Settings", icon: Settings, path: "/settings" },
  ];

  return (
    <div
      className={`min-h-screen bg-green-950 text-white flex flex-col border-r border-green-900 shadow-xl transition-all duration-300 ${
        isCollapsed ? "w-24 p-4" : "w-72 p-6"
      }`}
    >

      <div className={`mb-8 flex gap-3 ${isCollapsed ? "flex-col items-center" : "items-center justify-between"}`}>
        <div className={`flex items-center gap-3 min-w-0 ${isCollapsed ? "justify-center" : ""}`}>
          <div className="shrink-0 w-12 h-12 rounded-2xl bg-white border-2 border-green-400 flex items-center justify-center shadow-[3px_3px_0_0_rgba(34,197,94,0.45)] overflow-hidden">
            <img src={logo} alt="TGMCI" className="w-10 h-10 object-contain" />
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <h1 className="text-lg font-black tracking-widest uppercase text-white leading-none">
                TGMCI MRS
              </h1>
              <p className="text-[10px] text-green-300/70 font-black uppercase tracking-widest mt-1">
                Medical Records System
              </p>
            </div>
          )}
        </div>

        {showCloseButton && (
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-green-800/70 text-green-100 hover:bg-green-700 transition-colors"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        )}

        {!showCloseButton && onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="hidden lg:inline-flex p-2 rounded-xl bg-green-900/80 text-green-100 hover:bg-green-800 transition-colors"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-2">
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
                flex items-center rounded-xl cursor-pointer transition-all duration-200 group
                ${isCollapsed ? "justify-center px-0 py-3" : "gap-4 px-4 py-3"}
                ${
                  isActive
                    ? "bg-white text-green-900 shadow-lg shadow-green-950/20"
                    : "text-green-100 hover:bg-green-800/50 hover:text-white"
                }
              `}
            >
              <item.icon
                size={20}
                className={
                  isActive
                    ? "text-green-700"
                    : "text-green-400 group-hover:text-white"
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
                  className="ml-auto w-1.5 h-1.5 rounded-full bg-green-600"
                />
              )}
            </Motion.div>
          );
        })}
      </nav>

      <div className="mt-auto pt-6 border-t border-green-800/50">
        {isCollapsed ? (
          <div className="mx-auto w-2 h-2 rounded-full bg-green-400" />
        ) : (
          <p className="px-2 text-[10px] text-green-300/60 font-bold uppercase tracking-widest">
            Secured Records Workspace
          </p>
        )}
      </div>
    </div>
  );
}
