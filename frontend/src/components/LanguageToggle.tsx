import type { Language } from "../api";

interface Props {
  value: Language;
  onChange: (lang: Language) => void;
}

export default function LanguageToggle({ value, onChange }: Props) {
  return (
    <div role="group" aria-label="Language" style={{ display: "inline-flex", border: "1.5px solid var(--bb-border)", borderRadius: 999, padding: 3, background: "white" }}>
      {(["en", "es"] as Language[]).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => onChange(l)}
          aria-pressed={value === l}
          style={{
            border: "none",
            background: value === l ? "var(--bb-green)" : "transparent",
            color: value === l ? "white" : "var(--bb-text-soft)",
            padding: "6px 14px",
            borderRadius: 999,
            fontWeight: 600,
            fontSize: "0.85rem",
          }}
        >
          {l === "en" ? "EN" : "ES"}
        </button>
      ))}
    </div>
  );
}
