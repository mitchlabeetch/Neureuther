// Central resolver for the API origin used by every fetch in the app.
//
// - Web builds: returns "" so all /api calls stay same-origin. This works
//   across every deploy URL (production and preview) with no extra config
//   and keeps session cookies first-party.
// - Native (Capacitor) builds: the compiled bundle is served from
//   capacitor://localhost (iOS) or http://localhost (Android) with NO backend
//   attached, so every API call must target the deployed origin. We set
//   window.__API_BASE_URL__ once, here, at first import, from the
//   VITE_API_BASE_URL build variable.
//
// IMPORTANT: this module must be imported before anything that reads the API
// origin (auth-client, store, PinGate). main.tsx imports it first.
import { Capacitor } from "@capacitor/core";

const configuredApiOrigin = String(import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

if (
  typeof window !== "undefined" &&
  !window.__API_BASE_URL__ &&
  Capacitor.isNativePlatform() &&
  configuredApiOrigin
) {
  window.__API_BASE_URL__ = configuredApiOrigin;
}

/**
 * Returns the origin to prefix API paths with.
 * Empty string on web (same-origin), the deployed origin on native.
 */
export function getApiBaseUrl(): string {
  if (typeof window !== "undefined" && window.__API_BASE_URL__) {
    return window.__API_BASE_URL__.replace(/\/$/, "");
  }
  if (Capacitor.isNativePlatform()) return configuredApiOrigin;
  return "";
}
