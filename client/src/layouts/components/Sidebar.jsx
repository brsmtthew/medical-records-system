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
  ClipboardList,
  Files,
  FlaskConical,
  PrinterCheck,
  Settings,
  UserCog,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import logo from "@assets/TGMCI_LOGO.png";
import fallbackLogo from "@assets/tgmci_logo.jpg";
import { useAuth } from "@features/auth/context/useAuth";
import { roleLabel } from "@shared/constants/userRoles";

export default function Sidebar({
  isCollapsed = false,
  onToggleCollapse,
  onNavigate,
  onClose,
  showCloseButton = false,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin, isMedicalRecordsUser, userRole } = useAuth();
  const [logoSrc, setLogoSrc] = useState(logo);
  const [logoFailed, setLogoFailed] = useState(false);
  // Defines the app sections used by both desktop and mobile navigation.
  const recordsNavSections = [
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
        { name: "Chart Circulation", icon: FileText, path: "/charts" },
        { name: "Chart Viewing", icon: FileSearch, path: "/chart-viewing" },
      ],
    },
    {
      label: "Documents",
      items: [
        { name: "Medical Documents", icon: Files, path: "/medical-documents" },
        { name: "Laboratory Results", icon: FlaskConical, path: "/lab-results" },
        { name: "Civil Documents", icon: BadgeCheck, path: "/vital-certificates" },
      ],
    },
    {
      label: "Reports",
      items: [
        { name: "Chart Reports", icon: BarChart3, path: "/reports" },
        { name: "Medical Reports", icon: ClipboardList, path: "/tracking-reports" },
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
  const clinicalNavSections = [
    {
      label: roleLabel(userRole),
      items: [
        { name: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
      ],
    },
    {
      label: "Chart Requests",
      items: [
        { name: "Request Chart", icon: FileText, path: "/dashboard" },
        { name: "My Requests", icon: ClipboardList, path: "/dashboard" },
      ],
    },
  ];
  const navSections = isMedicalRecordsUser ? recordsNavSections : clinicalNavSections;

  return (
    <div
      className={`mrs-sidebar relative flex h-full min-h-0 select-none flex-col overflow-hidden border-r text-slate-100 shadow-xl transition-all duration-300 ease-out ${
        isCollapsed ? "w-20 p-2.5 2xl:w-24" : "w-64 p-3 2xl:w-72"
      }`}
    >

      <div className={`mb-2.5 flex shrink-0 gap-3 ${isCollapsed ? "flex-col items-center" : "items-center"}`}>
        <div className={`flex items-center min-w-0 ${isCollapsed ? "justify-center" : "w-full"}`}>
          <div
            className={`mrs-logo-frame shrink-0 rounded-xl border border-white/15 flex items-center justify-center shadow-xl shadow-slate-950/20 overflow-hidden transition-all duration-300 ${
              isCollapsed ? "h-10 w-10 p-1.5 2xl:h-11 2xl:w-11" : "h-12 w-full p-1.5 2xl:h-[3.1rem]"
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
                className="h-full w-full object-contain"
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

      <nav className="min-h-0 flex-1 space-y-1.5 overflow-hidden pr-0.5 2xl:space-y-2">
        {navSections.map((section) => (
          section.items.length > 0 && (
            <div key={section.label} className="space-y-1">
              {!isCollapsed && (
                <div className="mrs-sidebar-section-header flex items-center gap-2 px-2.5 py-0.5">
                  <p className="text-[8px] font-black uppercase tracking-[0.26em]">
                    {section.label}
                  </p>
                </div>
              )}
              {section.items.map((item) => {
                const isActive = location.pathname === item.path;

                return (
                  <Motion.button
                    type="button"
                    key={item.name}
                    onClick={() => {
                      navigate(item.path);
                      onNavigate?.();
                    }}
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    title={isCollapsed ? item.name : undefined}
                    className={`
                      mrs-sidebar-link group flex w-full cursor-pointer items-center rounded-xl border text-left transition-all duration-300 ease-out
                      ${isCollapsed ? "justify-center px-0 py-2 2xl:py-2.5" : "gap-2.5 px-2.5 py-1.5 2xl:gap-3 2xl:px-3 2xl:py-2"}
                      ${isActive ? "mrs-sidebar-link-active" : ""}
                    `}
                  >
                    <span className={`mrs-sidebar-icon-frame flex shrink-0 items-center justify-center rounded-lg transition-all ${
                      isCollapsed ? "size-9 2xl:size-10" : "size-7 2xl:size-8"
                    }`}>
                      <item.icon
                        size={isCollapsed ? 19 : 17}
                        strokeWidth={2.2}
                      />
                    </span>

                    {!isCollapsed && (
                      <span className="min-w-0 flex-1 whitespace-nowrap text-xs font-bold tracking-wide 2xl:text-sm">
                        {item.name}
                      </span>
                    )}

                    {isActive && !isCollapsed && (
                      <Motion.div
                        layoutId="activeIndicator"
                        className="ml-auto h-1.5 w-1.5 rounded-full bg-green-600"
                      />
                    )}
                  </Motion.button>
                );
              })}
            </div>
          )
        ))}
      </nav>

      <div className="mrs-sidebar-footer mt-2 shrink-0 border-t pt-2">
        {!showCloseButton && onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className={`mrs-sidebar-toggle hidden lg:flex items-center rounded-lg border text-slate-300 transition-all duration-300 ${
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
