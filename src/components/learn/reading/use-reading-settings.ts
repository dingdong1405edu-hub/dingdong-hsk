"use client";
import { useEffect, useState } from "react";
import type { ReadingSettings } from "./types";

const KEY = "dingdong:reading-settings";
const DEFAULTS: ReadingSettings = { fontSize: 17, leading: 1.95, theme: "paper" };

/** Reading display preferences (font size / line spacing / theme), persisted to localStorage. */
export function useReadingSettings() {
  const [settings, setSettings] = useState<ReadingSettings>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setSettings({ ...DEFAULTS, ...(JSON.parse(raw) as Partial<ReadingSettings>) });
    } catch {
      /* ignore corrupt prefs */
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(settings));
    } catch {
      /* storage unavailable (private mode) — non-fatal */
    }
  }, [settings, loaded]);

  return { settings, setSettings };
}
