import React, { useLayoutEffect } from "react";
import { BrowserRouter as Router } from "react-router-dom";

import { AuthProvider } from "./context/AuthProvider";
import AppRoutes from "./routes/AppRoutes";
import { applySystemTheme } from "./utils/systemSettings";

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
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}
