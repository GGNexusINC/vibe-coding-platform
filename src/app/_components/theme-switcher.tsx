"use client";

import { useEffect, useState, useRef } from "react";

type ThemeOption = {
  id: string;
  name: string;
  colors: string[]; // Color representations for the UI dots
};

const THEMES: ThemeOption[] = [
  { id: "forest", name: "Forest Oasis", colors: ["#0a0d06", "#84cc16", "#f97316"] },
  { id: "cyberpunk", name: "Midnight Cyber", colors: ["#030712", "#06b6d4", "#d946ef"] },
  { id: "amethyst", name: "Amethyst Void", colors: ["#0b071a", "#a855f7", "#ec4899"] },
  { id: "solar", name: "Solar Flare", colors: ["#110c05", "#f97316", "#fbbf24"] },
  { id: "ocean", name: "Abyssal Ocean", colors: ["#020b14", "#0ea5e9", "#10b981"] },
  { id: "mayhem", name: "Crimson Mayhem", colors: ["#080000", "#f43f5e", "#be123c"] },
];

export function ThemeSwitcher() {
  const [activeTheme, setActiveTheme] = useState("forest");
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Initialize theme from localStorage / cookie
  useEffect(() => {
    let savedTheme = "forest";
    try {
      savedTheme = localStorage.getItem("nh_theme") || "forest";
    } catch {
      savedTheme = "forest";
    }

    // Double check cookie fallback
    if (!savedTheme) {
      const match = document.cookie.match(/(?:^|; )nh_theme=([^;]*)/);
      if (match) {
        savedTheme = match[1];
      }
    }

    applyTheme(savedTheme);
  }, []);

  const applyTheme = (themeId: string) => {
    setActiveTheme(themeId);

    // Remove existing themes from body
    THEMES.forEach((t) => {
      document.body.classList.remove(`theme-${t.id}`);
    });

    // Add new theme class
    document.body.classList.add(`theme-${themeId}`);

    // Persist
    try {
      localStorage.setItem("nh_theme", themeId);
    } catch (e) {
      // safe write
    }

    // Set cookie
    document.cookie = `nh_theme=${themeId}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
  };

  const handleSelect = (themeId: string) => {
    applyTheme(themeId);
    setIsOpen(false);
  };

  const currentTheme = THEMES.find((t) => t.id === activeTheme) || THEMES[0];

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-10 items-center gap-2.5 rounded-full border border-orange-400/20 bg-[#0d110a]/80 px-4 text-xs font-bold text-orange-200 transition hover:bg-orange-400/10 hover:text-white"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <span className="flex items-center gap-1">
          {currentTheme.colors.slice(1).map((c, i) => (
            <span
              key={i}
              className="h-2 w-2 rounded-full border border-white/10"
              style={{ backgroundColor: c }}
            />
          ))}
        </span>
        <span className="hidden sm:inline">{currentTheme.name}</span>
        <svg
          className={`h-3 w-3 text-orange-300/60 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-52 origin-top-right rounded-2xl border border-white/8 bg-slate-950 p-2 shadow-2xl ring-1 ring-black/5 focus:outline-none z-50">
          <div className="py-1" role="menu" aria-orientation="vertical">
            <div className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">
              Select Theme
            </div>
            {THEMES.map((theme) => {
              const isActive = theme.id === activeTheme;
              return (
                <button
                  key={theme.id}
                  onClick={() => handleSelect(theme.id)}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-semibold transition ${
                    isActive
                      ? "bg-orange-500/15 text-orange-200"
                      : "text-slate-400 hover:bg-white/5 hover:text-slate-100"
                  }`}
                  role="menuitem"
                >
                  <span className="flex items-center gap-2">
                    <span className="flex items-center gap-0.5">
                      {theme.colors.slice(1).map((c, idx) => (
                        <span
                          key={idx}
                          className="h-1.5 w-1.5 rounded-full border border-white/5"
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </span>
                    <span>{theme.name}</span>
                  </span>
                  {isActive && (
                    <span className="h-1.5 w-1.5 rounded-full bg-orange-400 shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
