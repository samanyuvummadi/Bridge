import { useEffect, useMemo, useState } from "react";
import type { IntakeProfile, Language, MatchedProgram } from "../api";
import { getSupportScript } from "../api";

function normCity(city: string): string {
  return (city || "").trim().toLowerCase();
}

function firstName(fullName: string): string {
  return (fullName || "there").trim().split(" ")[0] || "there";
}

export default function SupportModal({
  open,
  onClose,
  profile,
  programs,
  language,
}: {
  open: boolean;
  onClose: () => void;
  profile: IntakeProfile;
  programs: MatchedProgram[];
  language: Language;
}) {
  const [script, setScript] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const city = normCity(profile.city);
  const dialOrder = useMemo(() => {
    const universal = { label: "Call 2-1-1 (Sacramento/Yolo Resources)", tel: "211", primary: true };
    const yolo = { label: "Call Yolo County HHSA", tel: "5306668350", primary: false };
    const sac = { label: "Call Sacramento County DHA", tel: "9168743100", primary: false };
    if (city === "davis" || city === "woodland") return [universal, yolo, sac];
    if (city === "sacramento") return [universal, sac, yolo];
    return [universal, yolo, sac];
  }, [city]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setCopied(false);
    getSupportScript(profile, programs.map((p) => p.name), language)
      .then((t) => {
        if (!cancelled) setScript(t);
      })
      .catch(() => {
        const names = programs.slice(0, 3).map((p) => p.name).join(", ");
        const student = profile.is_student ? "I'm a student." : "";
        const loc = profile.city ? `I live in ${profile.city}, CA.` : "I live in California.";
        const fallback =
          `Hi, I'm using Bridge. ${student} ${loc} ` +
          `It looks like I may qualify for ${names || "a few programs"}. Can you help me finalize my next steps?`;
        if (!cancelled) setScript(fallback);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, profile, programs, language]);

  if (!open) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(script);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // noop: clipboard may be blocked; user can still select manually.
    }
  };

  return (
    <div className="bb-modal-backdrop" role="dialog" aria-modal="true">
      <div className="bb-modal">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
          <div>
            <h2 style={{ marginTop: 0, marginBottom: 6 }}>
              Connect with a Sacramento/Yolo Specialist
            </h2>
            <div style={{ color: "var(--bb-text-soft)" }}>
              {firstName(profile.full_name)}, your summary is ready to read or copy.
            </div>
          </div>
          <button type="button" className="bb-btn bb-btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="bb-support-quote" style={{ marginTop: 14 }}>
          <div className="bb-support-quote-label">Script</div>
          <div style={{ whiteSpace: "pre-wrap" }}>
            {loading ? "Generating a short handover script…" : script}
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
            <button type="button" className="bb-btn bb-btn-secondary" onClick={handleCopy} disabled={!script || loading}>
              {copied ? "Copied" : "Copy Script"}
            </button>
          </div>
        </div>

        <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
          {dialOrder.map((d, idx) => (
            <button
              key={d.tel}
              type="button"
              className={idx === 0 ? "bb-btn bb-btn-block" : "bb-btn bb-btn-secondary bb-btn-block"}
              onClick={() => (window.location.href = `tel:${d.tel}`)}
            >
              {d.label}
            </button>
          ))}
        </div>

        <div className="bb-disclaimer" style={{ marginTop: 14 }}>
          Calls to 2-1-1 are free and confidential. Bridge is not affiliated with these government agencies.
        </div>
      </div>
    </div>
  );
}

