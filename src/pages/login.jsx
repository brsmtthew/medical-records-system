import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion as Motion, AnimatePresence } from "framer-motion";
import logo from "../assets/TGMCI_LOGO.png";

export default function Login() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true); // Toggle between Login and Signup
  const [form, setForm] = useState({ 
    email: "", 
    password: "", 
    confirmPassword: "", 
    role: "doctor",
    fullName: "" 
  });
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (isLogin) {
      if (!form.email || !form.password) {
        setError("Please fill in all fields");
        return;
      }
      setError("");
      // Logic for navigation
      if (form.role === "admin") navigate("/admin");
      else if (form.role === "doctor") navigate("/doctor");
      else navigate("/nurse");
    } else {
      // Signup Logic
      if (!form.email || !form.password || !form.fullName) {
        setError("All fields are required for registration");
        return;
      }
      if (form.password !== form.confirmPassword) {
        setError("Passwords do not match");
        return;
      }
      setError("");
      alert("Registration request sent to Administrator.");
      setIsLogin(true);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 font-sans">
      {/* LEFT SIDE - BRANDING */}
      <Motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="hidden lg:flex w-1/2 bg-gradient-to-br from-green-700 to-green-900 text-white flex-col justify-center items-center p-12 relative"
      >
        <Motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="z-10 text-center"
        >
          <div className="bg-white p-6 rounded-2xl shadow-2xl mb-8 mx-auto w-48 h-32 flex items-center justify-center">
            <img
              src={logo}
              className="max-w-full max-h-full object-contain"
              alt="TGMCI Logo"
            />
          </div>
          
          <h1 className="text-4xl font-black tracking-tight uppercase">
            Medical Records System
          </h1>
          <p className="mt-4 text-green-100 font-medium max-w-sm mx-auto leading-relaxed">
            Securely access and manage patient data, clinical notes, and historical medical records.
          </p>
        </Motion.div>
      </Motion.div>

      {/* RIGHT SIDE - FORM CONTAINER */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-6 bg-white lg:bg-transparent">
        <Motion.div
          layout // Smoothly animates size changes when switching forms
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="bg-white p-10 rounded-3xl w-full max-w-md border-2 border-green-500/30 shadow-[0_20px_60px_-15px_rgba(34,197,94,0.2)]"
        >
          <div className="mb-8 text-center lg:text-left">
            <h2 className="text-3xl font-bold text-slate-800">
              {isLogin ? "Welcome Back" : "Create Account"}
            </h2>
            <p className="text-slate-500 mt-2">
              {isLogin ? "Please enter your details to sign in." : "Fill in the details to request access."}
            </p>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <Motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-red-50 border-l-4 border-red-500 text-red-700 p-3 rounded mb-6 text-sm font-medium overflow-hidden"
              >
                {error}
              </Motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <Motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                <label className="block text-sm font-bold text-slate-700 mb-1 ml-1">Full Name</label>
                <input
                  type="text"
                  placeholder="Dr. John Doe"
                  className="w-full border-2 border-black bg-white px-4 py-3 rounded-xl focus:ring-2 focus:ring-green-600 focus:border-transparent outline-none transition-all placeholder:text-slate-400"
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                />
              </Motion.div>
            )}

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1 ml-1">Email Address</label>
              <input
                type="email"
                placeholder="name@hospital.com"
                className="w-full border-2 border-black bg-white px-4 py-3 rounded-xl focus:ring-2 focus:ring-green-600 focus:border-transparent outline-none transition-all placeholder:text-slate-400"
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1 ml-1">Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full border-2 border-black bg-white px-4 py-3 rounded-xl focus:ring-2 focus:ring-green-600 focus:border-transparent outline-none transition-all placeholder:text-slate-400"
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </div>

              {!isLogin && (
                <Motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
                  <label className="block text-sm font-bold text-slate-700 mb-1 ml-1">Confirm Password</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="w-full border-2 border-black bg-white px-4 py-3 rounded-xl focus:ring-2 focus:ring-green-600 focus:border-transparent outline-none transition-all placeholder:text-slate-400"
                    onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                  />
                </Motion.div>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1 ml-1">Assigned Role</label>
              <div className="relative">
                <select
                  className="w-full border-2 border-black bg-white px-4 py-3 rounded-xl focus:ring-2 focus:ring-green-600 outline-none appearance-none transition-all cursor-pointer"
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  value={form.role}
                >
                  <option value="doctor">Doctor</option>
                  <option value="nurse">Nurse</option>
                  <option value="admin">Administrator</option>
                </select>
                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                  <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {isLogin && (
              <div className="flex items-center justify-between text-sm px-1">
                <label className="flex items-center text-slate-600 cursor-pointer">
                  <input type="checkbox" className="mr-2 rounded border-black text-green-600 focus:ring-green-500" />
                  Keep me logged in
                </label>
                <a href="#" className="text-green-700 font-bold hover:text-green-800 transition-colors">Forgot password?</a>
              </div>
            )}

            <Motion.button
              whileHover={{ scale: 1.02, backgroundColor: "#15803d" }}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-green-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-green-200 transition-all text-lg mt-2"
            >
              {isLogin ? "Sign In" : "Register Now"}
            </Motion.button>
          </form>

          {/* TOGGLE LINK */}
          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-slate-600 text-sm">
              {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
              <button 
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError("");
                }} 
                className="text-green-700 font-bold hover:text-green-900 transition-colors underline-offset-4 hover:underline"
              >
                {isLogin ? "Request Access / Sign Up" : "Back to Login"}
              </button>
            </p>
          </div>
        </Motion.div>
      </div>
    </div>
  );
}