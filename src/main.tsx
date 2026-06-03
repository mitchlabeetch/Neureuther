import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./globals.css";

// Wrap history.pushState / history.replaceState with the View Transitions
// API so any React Router navigation triggers a smooth cross-page
// transition. Browsers without support fall through to instant
// navigation automatically.
(function patchHistoryForViewTransitions() {
  if (typeof document === "undefined") return;
  const doc = document as Document & {
    startViewTransition?: (cb: () => Promise<void> | void) => unknown;
  };
  if (typeof doc.startViewTransition !== "function") return;

  type HistoryStateFn = typeof window.history.pushState;

  const wrap = (original: HistoryStateFn): HistoryStateFn =>
    function (this: History, ...args: Parameters<HistoryStateFn>) {
      doc.startViewTransition!(() => {
        return new Promise<void>((resolve) => {
          original.apply(this, args);
          // Wait two animation frames so React can commit the new
          // render before the browser snapshots the new state.
          requestAnimationFrame(() => {
            requestAnimationFrame(() => resolve());
          });
        });
      });
    };

  window.history.pushState = wrap(window.history.pushState);
  window.history.replaceState = wrap(window.history.replaceState);
})();

createRoot(document.getElementById("root")!).render(<App />);
