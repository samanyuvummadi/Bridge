import { useMemo, useState } from "react";
import type { Enrollment } from "../utils/enrollments";
import { accumulatedValueForEnrollment, daysUntilRenewal, getUrgency } from "../utils/enrollments";
import { RENEWAL_DOCS } from "../data/renewalDocs";
import { IconBell, IconClipboard } from "./icons";

function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function RenewalCard({
  enrollment,
  language,
  onReminderToggle,
  onReapply,
}: {
  enrollment: Enrollment;
  language: "en" | "es";
  onReminderToggle: (programName: string, next: boolean) => Promise<void> | void;
  onReapply?: (programName: string) => void;
}) {
  const [showDocs, setShowDocs] = useState(false);
  const [isTogglingReminder, setIsTogglingReminder] = useState(false);

  const daysRemaining = daysUntilRenewal(enrollment.renewal_date);
  const urgency = getUrgency(daysRemaining);

  const totalPeriodDays = useMemo(() => {
    const start = new Date(`${enrollment.enrolled_date}T00:00:00`).getTime();
    const end = new Date(`${enrollment.renewal_date}T00:00:00`).getTime();
    return Math.max(1, Math.floor((end - start) / (1000 * 60 * 60 * 24)));
  }, [enrollment.enrolled_date, enrollment.renewal_date]);

  const daysSinceEnrollment = useMemo(() => {
    const start = new Date(`${enrollment.enrolled_date}T00:00:00`).getTime();
    const today = new Date().setHours(0, 0, 0, 0);
    return Math.max(0, Math.floor((today - start) / (1000 * 60 * 60 * 24)));
  }, [enrollment.enrolled_date]);

  const progressPct = clamp((daysSinceEnrollment / totalPeriodDays) * 100, 0, 100);

  const badge =
    urgency === "safe"
      ? "ACTIVE"
      : urgency === "soon"
      ? "RENEW SOON"
      : urgency === "urgent"
      ? "ACTION NEEDED"
      : urgency === "critical"
      ? "URGENT"
      : "EXPIRED";

  const headline =
    urgency === "expired"
      ? language === "es"
        ? "Renovación vencida — vuelve a aplicar"
        : "Renewal overdue — reapply now"
      : daysRemaining > 60
      ? language === "es"
        ? `Renovación en ${daysRemaining} días`
        : `Renewal in ${daysRemaining} days`
      : daysRemaining >= 30
      ? language === "es"
        ? `Renovación en ${daysRemaining} días`
        : `Renewal in ${daysRemaining} days`
      : daysRemaining >= 7
      ? language === "es"
        ? `Renovación en ${daysRemaining} días — toma acción`
        : `Renewal in ${daysRemaining} days — take action`
      : language === "es"
      ? `Renovación en ${daysRemaining} días — URGENTE`
      : `Renewal in ${daysRemaining} days — URGENT`;

  const borderColor =
    urgency === "safe"
      ? "var(--bb-green)"
      : urgency === "soon"
      ? "var(--bb-amber)"
      : urgency === "urgent"
      ? "#D2691E"
      : urgency === "critical"
      ? "var(--bb-danger)"
      : "#9AA59A";

  const progressColor = borderColor;

  const docs =
    enrollment.renewal_docs && enrollment.renewal_docs.length > 0
      ? enrollment.renewal_docs
      : RENEWAL_DOCS[enrollment.program_name] || [];

  const estReceived = useMemo(() => accumulatedValueForEnrollment(enrollment), [enrollment]);

  const handleToggle = async () => {
    const next = !enrollment.reminder_set;
    setIsTogglingReminder(true);
    try {
      await onReminderToggle(enrollment.program_name, next);
    } finally {
      setIsTogglingReminder(false);
    }
  };

  return (
    <div
      className={`bb-renewal-card ${urgency === "critical" ? "bb-renewal-card-critical" : ""}`}
      style={{ borderLeft: `4px solid ${borderColor}` }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h3 style={{ margin: 0 }}>{enrollment.program_name}</h3>
            <span className={`bb-renewal-badge bb-renewal-badge-${urgency}`}>{badge}</span>
          </div>
          <div style={{ color: "var(--bb-text-soft)", marginTop: 4 }}>
            <span style={{ color: "var(--bb-green)", fontWeight: 700 }}>${enrollment.monthly_value}/month</span>
            <span style={{ marginLeft: 10 }}>· Est. received: ${estReceived.toLocaleString()}</span>
          </div>
        </div>
        <div style={{ textAlign: "right", color: "var(--bb-text-soft)", fontSize: "0.85rem" }}>
          {formatDate(enrollment.renewal_date)}
        </div>
      </div>

      <div style={{ marginTop: 14, fontWeight: 700 }}>{headline}</div>
      <div style={{ marginTop: 10 }}>
        <div className="bb-renewal-track">
          <div className="bb-renewal-fill" style={{ width: `${progressPct}%`, background: progressColor }} />
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
        <button type="button" className="bb-btn bb-btn-ghost" onClick={() => setShowDocs((v) => !v)}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <IconClipboard size={18} />
            Renewal Docs
          </span>
        </button>
        <button type="button" className="bb-btn bb-btn-secondary" onClick={handleToggle} disabled={isTogglingReminder}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <IconBell size={18} />
            Reminder: {enrollment.reminder_set ? "ON" : "OFF"}
          </span>
        </button>
        {urgency === "expired" && (
          <button type="button" className="bb-btn" onClick={() => onReapply?.(enrollment.program_name)}>
            Reapply
          </button>
        )}
      </div>

      {showDocs && (
        <div className="bb-renewal-docs">
          {docs.length === 0 ? (
            <div style={{ color: "var(--bb-text-soft)" }}>No renewal checklist available.</div>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {docs.map((d) => (
                <li key={d} style={{ margin: "8px 0" }}>
                  {d}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

