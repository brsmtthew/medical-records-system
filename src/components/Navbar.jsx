import React, { useState } from "react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  Building2,
  Calendar,
  ChevronDown,
  Circle,
  LogOut,
  MapPin,
  Menu,
  Settings,
  ShieldCheck,
  UserCircle,
} from "lucide-react";

const notifications = [
  { id: 1, title: "2 overdue charts", detail: "Follow-up required today", tone: "red" },
  { id: 2, title: "18 pending scans", detail: "Digitization queue needs review", tone: "amber" },
  { id: 3, title: "Build verified", detail: "System checks passed", tone: "green" },
];

export default function Navbar({ onMenuClick }) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  return (
    <div className="w-full bg-white border-b-2 border-black px-4 md:px-8 py-4 flex justify-between items-center sticky top-0 z-50">
      <div className="flex items-center gap-3 md:gap-4 min-w-0">
        <Motion.button
          whileTap={{ scale: 0.94 }}
          onClick={onMenuClick}
          className="lg:hidden shrink-0 p-2.5 bg-white border-2 border-black rounded-xl hover:bg-green-50 transition-colors"
          aria-label="Open menu"
        >
          <Menu size={22} className="text-slate-800" />
        </Motion.button>

        <div className="hidden sm:flex bg-green-600 p-2.5 rounded-xl border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
          <Building2 size={22} className="text-white" />
        </div>

        <div className="flex flex-col min-w-0">
          <h1 className="text-sm sm:text-lg font-black tracking-tight text-slate-900 leading-none truncate">
            TAGUM GLOBAL <span className="text-green-600">MEDICAL CENTER</span> INC.
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="hidden sm:inline bg-black text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest">
              MEDICAL RECORDS MANAGEMENT SYSTEM
            </span>
            <div className="hidden md:flex items-center gap-1 text-slate-400">
              <MapPin size={10} />
              <span className="text-[10px] font-bold">Tagum City, PH</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 lg:gap-6">
        <div className="hidden lg:flex items-center gap-2 text-slate-500 px-4 border-r border-slate-200">
          <Calendar size={16} />
          <span className="text-xs font-bold uppercase tracking-wider">
            {new Date().toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>

        <div className="relative">
          <Motion.button
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            onClick={() => {
              setShowNotifications((value) => !value);
              setShowProfile(false);
            }}
            className="relative p-2 bg-slate-50 border-2 border-black rounded-lg hover:bg-green-50 transition-colors"
            aria-label="Open notifications"
          >
            <Bell size={20} className="text-slate-700" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 border-2 border-white rounded-full flex items-center justify-center text-[10px] text-white font-bold">
              {notifications.length}
            </span>
          </Motion.button>

          <AnimatePresence>
            {showNotifications && (
              <Motion.div
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                className="absolute right-0 mt-3 w-80 max-w-[calc(100vw-2rem)] bg-white border-2 border-black rounded-2xl shadow-[6px_6px_0_0_rgba(0,0,0,1)] overflow-hidden"
              >
                <div className="p-4 border-b-2 border-black bg-slate-50">
                  <p className="font-black uppercase text-slate-800">Notifications</p>
                  <p className="text-xs font-bold text-slate-400">Records activity and alerts</p>
                </div>
                <div className="divide-y divide-slate-100">
                  {notifications.map((item) => (
                    <button
                      key={item.id}
                      className="w-full p-4 text-left hover:bg-slate-50 transition-colors flex gap-3"
                    >
                      <span
                        className={`mt-1 h-2.5 w-2.5 rounded-full ${
                          item.tone === "red"
                            ? "bg-red-500"
                            : item.tone === "amber"
                              ? "bg-amber-500"
                              : "bg-green-500"
                        }`}
                      />
                      <span>
                        <span className="block text-sm font-black text-slate-800">{item.title}</span>
                        <span className="block text-xs font-semibold text-slate-500 mt-0.5">
                          {item.detail}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </Motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="relative hidden sm:block">
          <Motion.button
            whileHover={{ y: -1 }}
            onClick={() => {
              setShowProfile((value) => !value);
              setShowNotifications(false);
            }}
            className="flex items-center gap-3 bg-slate-50 border-2 border-black p-1.5 pr-4 rounded-xl cursor-pointer"
          >
            <div className="w-8 h-8 bg-green-700 rounded-lg flex items-center justify-center text-white font-black text-xs border border-black shadow-sm">
              AD
            </div>
            <div className="flex flex-col text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-black text-slate-800 leading-tight">Admin</span>
                <Circle size={8} className="fill-green-500 text-green-500" />
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                Main Hospital
              </span>
            </div>
            <ChevronDown
              size={14}
              className={`text-slate-400 ml-2 transition-transform ${showProfile ? "rotate-180" : ""}`}
            />
          </Motion.button>

          <AnimatePresence>
            {showProfile && (
              <Motion.div
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                className="absolute right-0 mt-3 w-64 bg-white border-2 border-black rounded-2xl shadow-[6px_6px_0_0_rgba(0,0,0,1)] overflow-hidden"
              >
                <div className="p-4 border-b-2 border-black bg-green-50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-green-700 text-white border border-black">
                      <UserCircle size={22} />
                    </div>
                    <div>
                      <p className="font-black text-slate-800">Administrator</p>
                      <p className="text-xs font-bold text-slate-500">Medical Records</p>
                    </div>
                  </div>
                </div>
                <div className="p-2">
                  <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50">
                    <ShieldCheck size={17} />
                    Access Level: Admin
                  </button>
                  <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50">
                    <Settings size={17} />
                    Account Settings
                  </button>
                  <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-red-600 hover:bg-red-50">
                    <LogOut size={17} />
                    Sign Out
                  </button>
                </div>
              </Motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
