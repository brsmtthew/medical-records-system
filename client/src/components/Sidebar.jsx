import React, { useState } from "react";
import { motion as Motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  FileText,
  FileSearch,
  BarChart3,
  BadgeCheck,
  Files,
  FlaskConical,
  PrinterCheck,
  Settings,
  UserCog,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import logo from "../assets/TGMCI_LOGO.png";
import fallbackLogo from "../assets/tgmci_logo.jpg";
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
  const [logoSrc, setLogoSrc] = useState(logo);
  const [logoFailed, setLogoFailed] = useState(false);
  // Defines the app sections used by both desktop and mobile navigation.
  const navSections = [
    {
      label: "Workspace",
      items: [
        { name: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
        { name: "Patients", icon: Users, path: "/patients" },
      ],
    },
    {
      label: "Charts",
      items: [
        { name: "Charts Station", icon: FileText, path: "/charts" },
        { name: "Chart Viewing", icon: FileSearch, path: "/chart-viewing" },
      ],
    },
    {
      label: "Documents",
      items: [
        { name: "Medical Docs", icon: Files, path: "/medical-documents" },
        { name: "Lab Results", icon: FlaskConical, path: "/lab-results" },
        { name: "Vital Certs", icon: BadgeCheck, path: "/vital-certificates" },
      ],
    },
    {
      label: "Reports",
      items: [
        { name: "Chart Report Logs", icon: BarChart3, path: "/reports" },
        { name: "Medical Reports", icon: FileSearch, path: "/tracking-reports" },
        { name: "Print Reports", icon: PrinterCheck, path: "/print-reports" },
      ],
    },
    {
      label: "Administration",
      items: [
        ...(isAdmin ? [{ name: "Users", icon: UserCog, path: "/users" }] : []),
        { name: "Settings", icon: Settings, path: "/settings" },
      ],
    },
  ];

  return (
    <div
      className={`mrs-sidebar flex h-full min-h-0 select-none flex-col border-r text-slate-700 shadow-xl shadow-slate-900/5 transition-all duration-300 ease-out ${
        isCollapsed ? "w-20 p-3 2xl:w-24" : "w-64 p-3 2xl:w-72 2xl:p-4"
      }`}
    >

      <div className={`mb-3 flex shrink-0 gap-3 ${isCollapsed ? "flex-col items-center" : "items-center"}`}>
        <div className={`flex items-center min-w-0 ${isCollapsed ? "justify-center" : "w-full"}`}>
          <div
            className={`mrs-logo-frame shrink-0 rounded-lg border border-white/15 flex items-center justify-center shadow-xl shadow-slate-950/20 overflow-hidden transition-all duration-300 ${
              isCollapsed ? "h-10 w-10 p-1.5 2xl:h-11 2xl:w-11" : "h-11 w-full p-1.5 2xl:h-12 2xl:p-2"
            }`}
          >
            {logoFailed ? (
              <span className="text-sm font-black uppercase tracking-wide text-cyan-800">
                TGMCI
              </span>
            ) : (
              <img
                src={logoSrc}
                alt="TGMCI"
                className="h-[115%] w-[115%] object-contain"
                onError={() => {
                  if (logoSrc !== fallbackLogo) {
                    setLogoSrc(fallbackLogo);
                    return;
                  }
                  setLogoFailed(true);
                }}
              />
            )}
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

      <nav className="min-h-0 flex-1 space-y-2 overflow-hidden pr-0.5 2xl:space-y-2.5">
        {navSections.map((section) => (
          section.items.length > 0 && (
            <div key={section.label} className="space-y-1">
              {!isCollapsed && (
                <p className="px-3 text-[8px] font-black uppercase tracking-[0.22em] text-slate-400">
                  {section.label}
                </p>
              )}
              {section.items.map((item) => {
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
                      group flex cursor-pointer items-center rounded-lg transition-all duration-300 ease-out
                      ${isCollapsed ? "justify-center px-0 py-2 2xl:py-2.5" : "gap-3 px-3 py-2 2xl:gap-4 2xl:px-4 2xl:py-2.5"}
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
                      <span className="text-xs font-bold tracking-wide 2xl:text-sm">
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
            </div>
          )
        ))}
      </nav>

      <div className="mt-2 shrink-0 border-t border-slate-100 pt-2">
        {!showCloseButton && onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className={`hidden lg:flex items-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition-all duration-300 hover:border-cyan-200 hover:bg-cyan-50 hover:text-cyan-700 ${
              isCollapsed ? "mx-auto size-9 justify-center 2xl:size-10" : "w-full justify-between px-3 py-2"
            }`}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {!isCollapsed && <span className="text-[10px] font-black uppercase tracking-widest">Panel</span>}
            {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        )}
      </div>
    </div>
  );
}
