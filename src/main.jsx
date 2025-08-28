import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import Dashboard from "./Dashboard.jsx";   // ✅ import your new dashboard
import "./index.css";

/* Mantine styles + providers */
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";

import { BrowserRouter, Routes, Route } from "react-router-dom"; //  add router

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <MantineProvider defaultColorScheme="light">
      <Notifications />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />              {/* Main app */}
          <Route path="/dashboard" element={<Dashboard />} /> {/* Dashboard */}
        </Routes>
      </BrowserRouter>
    </MantineProvider>
  </React.StrictMode>
);
