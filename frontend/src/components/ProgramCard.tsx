import { useState } from "react";
import type { Language, MatchedProgram } from "../api";

interface Strings {
  high: string;
  medium: string;
  low: string;
  monthly: string;
  learnMore: string;
  hide: string;
  prefill: string;
  remind: string;
  agency: string;
  renewal: string;
}

interface Props {
  program: MatchedProgram;
  language: Language;
  strings: Strings;
  onPreFill: () => void;
  onSetReminder: () => void;
  onOpen: () => void;
  delayIndex: number;
}

const PILL_CLASS: Record<MatchedProgram["confidence"], string> = {
  high: "bb-pill-high",
  medium: "bb-pill-medium",
  low: "bb-pill-low",
};

export default function ProgramCard({
  program,
  language,
  strings,
  onPreFill,
  onSetReminder,
  onOpen,
  delayIndex,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  const explanation =
    language === "es" && program.plain_language_explanation_es
      ? program.plain_language_explanation_es
      : program.plain_language_explanation;

  const confidenceLabel =
    program.confidence === "high"
      ? strings.high
      : program.confidence === "medium"
      ? strings.medium
      : strings.low;

  return (
    <div
      className="bb-card bb-rise"
      style={{ animationDelay: `${delayIndex * 90}ms` }}
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onOpen();
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h3 style={{ margin: "0 0 4px" }}>{program.name}</h3>
          <div style={{ color: "var(--bb-text-soft)", fontSize: "0.9rem" }}>{program.agency}</div>
        </div>
        <span className={`bb-pill ${PILL_CLASS[program.confidence]}`}>{confidenceLabel}</span>
      </div>

      <div style={{ marginTop: 14, fontFamily: "DM Serif Display, Georgia, serif", fontSize: "1.4rem", color: "var(--bb-green)" }}>
        {program.monthly_value_estimate}
      </div>
      <div style={{ fontSize: "0.85rem", color: "var(--bb-text-soft)", marginTop: 2 }}>
        {strings.renewal}: {program.renewal_date}
      </div>

      {expanded && (
        <p style={{ marginTop: 14, lineHeight: 1.55 }}>{explanation}</p>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
        <button
          type="button"
          className="bb-btn bb-btn-ghost"
          onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
        >
          {expanded ? strings.hide : strings.learnMore}
        </button>
        <button
          type="button"
          className="bb-btn bb-btn-secondary"
          onClick={(e) => { e.stopPropagation(); onSetReminder(); }}
        >
          {strings.remind}
        </button>
        <button
          type="button"
          className="bb-btn"
          onClick={(e) => { e.stopPropagation(); onPreFill(); }}
        >
          {strings.prefill}
        </button>
      </div>
    </div>
  );
}
