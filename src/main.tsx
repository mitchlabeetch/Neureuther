// Must run first: sets the native (Capacitor) API origin before any module
// (auth-client, store, PinGate) reads it.
import "./lib/api-base";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./globals.css";

createRoot(document.getElementById("root")!).render(<App />);
