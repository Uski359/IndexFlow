"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { MoonStar, SunMedium } from "lucide-react";

const THEME_TOGGLE_ENABLED = false;

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!THEME_TOGGLE_ENABLED) {
    return null;
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/10 p-2 text-sm text-white transition hover:bg-white/20"
      aria-label="Toggle theme"
    >
      {mounted && isDark ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
    </button>
  );
}
