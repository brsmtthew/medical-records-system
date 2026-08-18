import React, { Component, useLayoutEffect } from "react";
import { BrowserRouter as Router } from "react-router-dom";

import { AuthProvider } from "@features/auth/context/AuthProvider";
import AppRoutes from "./routes/AppRoutes";
import { applySystemTheme } from "@shared/utils/systemSettings";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("Unhandled render error:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="mrs-shell min-h-screen flex items-center justify-center p-4 font-sans">
          <div className="mrs-panel max-w-sm rounded-2xl p-6 text-center">
            <p className="text-xl font-black uppercase text-slate-800">Something Went Wrong</p>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              An unexpected error occurred. Refresh the page to continue.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mrs-primary-button mt-6 rounded-xl px-5 py-3 text-xs font-black uppercase"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  useLayoutEffect(() => {
    // Applies saved theme classes before routes paint so pages do not flash the wrong mode.
    const applyTheme = () => {
      applySystemTheme();
    };

    applyTheme();
    window.addEventListener("storage", applyTheme);
    window.addEventListener("mrs-settings-updated", applyTheme);

    return () => {
      window.removeEventListener("storage", applyTheme);
      window.removeEventListener("mrs-settings-updated", applyTheme);
    };
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <AppRoutes />
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}
