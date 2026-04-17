import React from "react";
import { motion as Motion } from "framer-motion";
import { 
  Search, 
  Bell, 
  Calendar, 
  ChevronDown,
  Circle
} from "lucide-react";

export default function Navbar() {
  return (
    <div className="w-full bg-white border-b-2 border-black px-8 py-4 flex justify-between items-center sticky top-0 z-50">
      
      {/* SEARCH AREA - Crucial for Medical Records */}
      <div className="hidden md:flex items-center relative w-96">
        <div className="absolute left-4 text-slate-400">
          <Search size={18} />
        </div>
        <input 
          type="text" 
          placeholder="Search patients, charts, or IDs..."
          className="w-full bg-slate-50 border-2 border-black py-2 pl-12 pr-4 rounded-xl text-sm focus:ring-2 focus:ring-green-500 outline-none transition-all"
        />
      </div>

      {/* RIGHT SIDE ACTIONS */}
      <div className="flex items-center gap-6">
        
        {/* DATE DISPLAY */}
        <div className="hidden lg:flex items-center gap-2 text-slate-500 px-4 border-r border-slate-200">
          <Calendar size={16} />
          <span className="text-xs font-bold uppercase tracking-wider">
            {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        </div>

        {/* NOTIFICATIONS */}
        <Motion.button 
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="relative p-2 bg-slate-50 border-2 border-black rounded-lg hover:bg-green-50 transition-colors"
        >
          <Bell size={20} className="text-slate-700" />
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 border-2 border-white rounded-full flex items-center justify-center text-[10px] text-white font-bold">
            3
          </span>
        </Motion.button>

        {/* ADMIN STATUS PANEL */}
        <Motion.div 
          whileHover={{ y: -1 }}
          className="flex items-center gap-3 bg-slate-50 border-2 border-black p-1.5 pr-4 rounded-xl cursor-pointer"
        >
          <div className="w-8 h-8 bg-green-700 rounded-lg flex items-center justify-center text-white font-black text-xs border border-black shadow-sm">
            AD
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-black text-slate-800 leading-tight">Admin</span>
              <Circle size={8} className="fill-green-500 text-green-500" />
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
              Main Hospital
            </span>
          </div>
          <ChevronDown size={14} className="text-slate-400 ml-2" />
        </Motion.div>

      </div>
    </div>
  );
}