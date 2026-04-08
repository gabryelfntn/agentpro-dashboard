"use client";

import { useEffect, useLayoutEffect, useState } from "react";

const SESSION_KEY = "agentpro-splash-v1";

export function AppSplash() {
  const [phase, setPhase] = useState<"boot" | "play" | "exit" | "off">("boot");

  useLayoutEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPhase("off");
      return;
    }
    try {
      if (sessionStorage.getItem(SESSION_KEY)) {
        setPhase("off");
        return;
      }
    } catch {
      /* private mode */
    }
    setPhase("play");
  }, []);

  useEffect(() => {
    if (phase !== "play") return;
    const exitAt = window.setTimeout(() => setPhase("exit"), 2400);
    const offAt = window.setTimeout(() => {
      try {
        sessionStorage.setItem(SESSION_KEY, "1");
      } catch {
        /* ignore */
      }
      setPhase("off");
    }, 3100);
    return () => {
      window.clearTimeout(exitAt);
      window.clearTimeout(offAt);
    };
  }, [phase]);

  if (phase === "off") return null;

  return (
    <div
      className={[
        "app-splash-root fixed inset-0 z-[10000] flex flex-col items-center justify-center",
        phase === "exit" ? "app-splash-root--exit" : "",
      ].join(" ")}
      aria-hidden={phase === "exit"}
    >
      <div className="app-splash-bg" />
      <div className="app-splash-orb app-splash-orb--a" />
      <div className="app-splash-orb app-splash-orb--b" />
      <div className="app-splash-orb app-splash-orb--c" />
      <div className="app-splash-grid" />

      <div className="app-splash-content relative z-10 flex flex-col items-center px-6">
        <div className="app-splash-mark mb-8">
          <svg
            viewBox="0 0 120 120"
            className="h-24 w-24 sm:h-28 sm:w-28"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
          >
            <defs>
              <linearGradient id="splash-stroke" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="50%" stopColor="#818cf8" />
                <stop offset="100%" stopColor="#22d3ee" />
              </linearGradient>
            </defs>
            <rect
              x="12"
              y="12"
              width="96"
              height="96"
              rx="28"
              stroke="url(#splash-stroke)"
              strokeWidth="2.5"
              className="app-splash-rect"
            />
            <path
              d="M40 78V42h12l8 14 8-14h12v36H68V58l-8 14-8-14v20H40z"
              fill="url(#splash-stroke)"
              fillOpacity="0.15"
              className="app-splash-fill"
            />
          </svg>
        </div>

        <h1 className="app-splash-title text-center text-4xl font-semibold tracking-tight sm:text-5xl">
          AgentPro
        </h1>
        <p className="app-splash-subtitle mt-3 text-center text-sm font-medium tracking-[0.35em] text-sky-200/70 uppercase">
          Pilotage activité
        </p>

        <div className="app-splash-progress mt-12 h-px w-48 overflow-hidden rounded-full bg-white/[0.08] sm:w-56">
          <div className="app-splash-progress-bar h-full rounded-full bg-gradient-to-r from-sky-500/80 via-indigo-400/90 to-cyan-400/80" />
        </div>
      </div>
    </div>
  );
}
