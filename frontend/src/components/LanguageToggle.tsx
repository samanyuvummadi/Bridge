import type { Language } from "../api";
import { useEffect, useMemo, useRef, useState } from "react";
import { IconChevronDown } from "./icons";

interface Props {
  value: Language;
  onChange: (lang: Language) => void;
}

export default function LanguageToggle({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const options = useMemo(
    () => [
      { key: "es", label: "Español" },
      { key: "zh", label: "中文 (Mandarin)" },
      { key: "hi", label: "हिन्दी (Hindi)" },
      { key: "ar", label: "العربية (Arabic)" },
      { key: "pt", label: "Português" },
      { key: "bn", label: "বাংলা (Bengali)" },
      { key: "ru", label: "Русский (Russian)" },
      { key: "ja", label: "日本語 (Japanese)" },
      { key: "pa", label: "ਪੰਜਾਬੀ (Punjabi)" },
      { key: "de", label: "Deutsch (German)" },
    ],
    []
  );

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node | null;
      if (t && rootRef.current && !rootRef.current.contains(t)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  };

  return (
    <>
      <div
        ref={rootRef}
        role="group"
        aria-label="Language"
        style={{
          display: "inline-flex",
          border: "1.5px solid var(--bb-border)",
          borderRadius: 999,
          padding: 3,
          background: "white",
          position: "relative",
        }}
      >
        <button
          type="button"
          onClick={() => onChange("en")}
          aria-pressed={value === "en"}
          style={{
            border: "none",
            background: value === "en" ? "var(--bb-green)" : "transparent",
            color: value === "en" ? "white" : "var(--bb-text-soft)",
            padding: "6px 14px",
            borderRadius: 999,
            fontWeight: 600,
            fontSize: "0.85rem",
          }}
        >
          EN
        </button>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-pressed={value === "es"}
          aria-haspopup="listbox"
          aria-expanded={open}
          style={{
            border: "none",
            background: value === "es" ? "var(--bb-green)" : "transparent",
            color: value === "es" ? "white" : "var(--bb-text-soft)",
            padding: "6px 10px 6px 14px",
            borderRadius: 999,
            fontWeight: 600,
            fontSize: "0.85rem",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          ES
          <IconChevronDown size={16} style={{ opacity: value === "es" ? 0.95 : 0.8 }} />
        </button>

        {open && (
          <div
            role="listbox"
            aria-label="Language options"
            style={{
              position: "absolute",
              top: "calc(100% + 8px)",
              right: 0,
              width: 240,
              background: "white",
              border: "1px solid var(--bb-border)",
              borderRadius: 12,
              boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
              padding: 6,
              zIndex: 90,
            }}
          >
            {options.map((opt) => (
              <button
                key={opt.key}
                type="button"
                role="option"
                onClick={() => {
                  setOpen(false);
                  if (opt.key === "es") {
                    onChange("es");
                  } else {
                    showToast("Coming soon");
                  }
                }}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "10px 10px",
                  border: "1px solid transparent",
                  borderRadius: 10,
                  background: "transparent",
                  color: "var(--bb-text)",
                  fontWeight: opt.key === "es" ? 800 : 600,
                  fontSize: "0.92rem",
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {toast && <div className="bb-toast">{toast}</div>}
    </>
  );
}
