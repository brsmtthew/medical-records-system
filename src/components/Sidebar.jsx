import React from "react";

import { motion as Motion } from "framer-motion";

import { useNavigate, useLocation } from "react-router-dom";

import {

  LayoutDashboard,

  Users,

  FileText,

  BarChart3,

  Settings,

  LogOut,

  UserCircle,

} from "lucide-react";



export default function Sidebar() {

  const navigate = useNavigate();

  const location = useLocation();



  const navItems = [

    { name: "Dashboard", icon: LayoutDashboard, path: "/admin" },

    { name: "Patients", icon: Users, path: "/patients" },

    { name: "Charts", icon: FileText, path: "/charts" },

    { name: "Reports", icon: BarChart3, path: "/reports" },

    { name: "Settings", icon: Settings, path: "/settings" },

  ];



  return (

    <div className="w-72 min-h-screen bg-green-900 text-white p-6 flex flex-col border-r border-green-800 shadow-xl">



      {/* BRANDING */}

      <div className="mb-10 px-2">

        <h1 className="text-xl font-black tracking-widest uppercase text-white">

          TGMCI <span className="text-green-400">MRS</span>

        </h1>

        <p className="text-[10px] text-green-300/60 font-bold uppercase tracking-tighter">

          Medical Records System

        </p>

      </div>



      {/* NAVIGATION */}

      <nav className="flex-1 space-y-2">

        {navItems.map((item) => {

          const isActive = location.pathname === item.path;



          return (

            <Motion.div

              key={item.name}

              onClick={() => navigate(item.path)}

              whileHover={{ x: 4 }}

              whileTap={{ scale: 0.98 }}

              className={`

                flex items-center gap-4 px-4 py-3 rounded-xl cursor-pointer transition-all duration-200 group

                ${isActive

                  ? "bg-white text-green-900 shadow-lg shadow-green-950/20"

                  : "text-green-100 hover:bg-green-800/50 hover:text-white"}

              `}

            >

              <item.icon

                size={20}

                className={isActive ? "text-green-700" : "text-green-400 group-hover:text-white"}

              />



              <span className="font-bold text-sm tracking-wide">

                {item.name}

              </span>



              {isActive && (

                <Motion.div

                  layoutId="activeIndicator"

                  className="ml-auto w-1.5 h-1.5 rounded-full bg-green-600"

                />

              )}

            </Motion.div>

          );

        })}

      </nav>



      {/* FOOTER / USER PROFILE */}

      <div className="mt-auto pt-6 border-t border-green-800/50">



        <div className="flex items-center gap-3 px-2 mb-6">

          <div className="bg-green-700 p-2 rounded-lg border border-green-600">

            <UserCircle size={24} className="text-green-100" />

          </div>

          <div>

            <p className="text-sm font-black text-white">Dr. Smith</p>

            <p className="text-[10px] text-green-400 font-bold uppercase">

              Administrator

            </p>

          </div>

        </div>



        <Motion.button

          whileHover={{ backgroundColor: "rgba(220, 38, 38, 0.1)" }}

          className="flex items-center gap-4 w-full px-4 py-3 rounded-xl text-red-400 font-bold text-sm transition-colors"

        >

          <LogOut size={20} />

          <span>Logout</span>

        </Motion.button>



      </div>

    </div>

  );

}