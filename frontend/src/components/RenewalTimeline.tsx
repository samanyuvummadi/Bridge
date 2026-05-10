import { useMemo, useState } from "react";
import type { Enrollment } from "../utils/enrollments";
import { RENEWAL_DOCS } from "../data/renewalDocs";
import { IconTimelineDot } from "./icons";

function formatMonthYear(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

export default function RenewalTimeline({ enrollments }: { enrollments: Enrollment[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const items = useMemo(() => {
    return [...enrollments]
      .filter((e) => e.status === "active")
      .sort((a, b) => a.renewal_date.localeCompare(b.renewal_date));
  }, [enrollments]);

  if (items.length === 0) return null;

  return (
    <div className="bb-card" style={{ marginTop: 16 }}>
      <h2 style={{ marginTop: 0 }}>Upcoming Renewal Checklist</h2>
      <div style={{ display: "grid", gap: 10 }}>
        {items.map((e) => {
          const isOpen = expanded === e.program_name;
          const docs = RENEWAL_DOCS[e.program_name] || [];
          return (
            <div key={e.program_name} className="bb-timeline-item">
              <button
                type="button"
                className="bb-timeline-btn"
                onClick={() => setExpanded(isOpen ? null : e.program_name)}
              >
                <div style={{ color: "var(--bb-text-soft)", fontSize: "0.85rem" }}>{formatMonthYear(e.renewal_date)}</div>
                <div style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
                  <IconTimelineDot size={10} style={{ color: "var(--bb-green)", flexShrink: 0 }} />
                  {e.program_name} renewal due
                </div>
                <div style={{ color: "var(--bb-text-soft)", fontSize: "0.9rem", marginTop: 2 }}>
                  {docs[0] ? `Bring ${docs[0].toLowerCase()}` : "Tap to view checklist"}
                </div>
              </button>

              {isOpen && (
                <div className="bb-timeline-expanded">
                  {docs.length === 0 ? (
                    <div style={{ color: "var(--bb-text-soft)" }}>No checklist available.</div>
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
        })}
      </div>
    </div>
  );
}

