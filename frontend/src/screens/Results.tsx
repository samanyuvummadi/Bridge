import { useEffect, useMemo, useState } from "react";
import ProgramCard from "../components/ProgramCard";
import DocumentList from "../components/DocumentList";
import { IconChevronDown } from "../components/icons";
import { IconPhone } from "../components/icons";
import SupportModal from "../components/SupportModal";
import { setSmsReminder } from "../api";
import type { IntakeResponse, Language, MatchedProgram, IntakeProfile } from "../api";
import { addEnrollment } from "../utils/enrollments";

interface Strings {
  qualifyHeadline: (firstName: string, count: number) => string;
  worthUpTo: (total: string) => string;
  programCard: {
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
  };
  docsTitle: string;
  docsProgress: (gathered: number, total: number) => string;
  startOver: string;
  reminderSet: (date: string) => string;
  reminderUnavailable: string;
  modal: {
    title: string;
    streetLabel: string;
    streetPlaceholder: string;
    ssnLabel: string;
    ssnHelp: string;
    employerLabel: string;
    separationLabel: string;
    cancel: string;
    confirm: string;
  };
}

interface Props {
  result: IntakeResponse;
  language: Language;
  strings: Strings;
  onSelectProgram: (program: MatchedProgram, profile: IntakeProfile) => void;
  onStartOver: () => void;
  onEnrollmentAdded?: () => void;
}

function CountUp({ to }: { to: number }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (to <= 0) { setV(0); return; }
    const start = performance.now();
    const duration = 800;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setV(Math.round(eased * to));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to]);
  return <>${v.toLocaleString()}</>;
}

export default function Results({ result, language, strings, onSelectProgram, onStartOver, onEnrollmentAdded }: Props) {
  const [toast, setToast] = useState<string | null>(null);
  const [modalProgram, setModalProgram] = useState<MatchedProgram | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [extraStreet, setExtraStreet] = useState(result.profile.address || "");
  const [extraSsn, setExtraSsn] = useState(result.profile.ssn_last4 || "");
  const [extraEmployer, setExtraEmployer] = useState(result.profile.last_employer || "");
  const [extraSeparation, setExtraSeparation] = useState(result.profile.separation_date || "");

  const firstName = (result.profile.full_name || "").trim().split(" ")[0] || "there";

  const totalAll = useMemo(
    () => result.matched_programs.reduce((sum, p) => sum + (p.monthly_value_low || 0), 0),
    [result.matched_programs]
  );

  const orderedPrograms = useMemo(() => {
    const PRIORITY = new Set(["CalFresh", "Medi-Cal", "Unemployment Insurance"]);
    const LOCAL = new Set([
      "SMUD EnergyHELP",
      "PG&E CARE/FERA",
      "SacRT RydeFree (Student) or Low-Income Fare",
      "Yolobus Reduced Fare",
      "Sacramento Public Library — Library of Things",
    ]);
    const score = (name: string) => (PRIORITY.has(name) ? 0 : LOCAL.has(name) ? 1 : 2);
    return [...result.matched_programs].sort((a, b) => {
      const sa = score(a.name);
      const sb = score(b.name);
      if (sa !== sb) return sa - sb;
      return (b.monthly_value_low || 0) - (a.monthly_value_low || 0);
    });
  }, [result.matched_programs]);

  const visiblePrograms = useMemo(() => {
    if (showAll) return orderedPrograms;
    return orderedPrograms.slice(0, 4);
  }, [orderedPrograms, showAll]);

  const remainingCount = Math.max(0, orderedPrograms.length - visiblePrograms.length);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 3500);
  };

  const handleReminder = async (program: MatchedProgram) => {
    try {
      const resp = await setSmsReminder(
        result.profile.phone,
        program.name,
        program.renewal_date,
        language
      );
      if (resp.success) {
        showToast(strings.reminderSet(program.renewal_date));
      } else {
        showToast(strings.reminderUnavailable);
      }
    } catch {
      showToast(strings.reminderUnavailable);
    }
  };

  const handlePreFill = (program: MatchedProgram) => {
    setModalProgram(program);
  };

  const parseMonthlyValue = (estimate: string): number => {
    const match = estimate.match(/\$(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  };

  const todayIso = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const confirmModal = () => {
    if (!modalProgram) return;
    const enriched: IntakeProfile = {
      ...result.profile,
      address: extraStreet || result.profile.address,
      ssn_last4: extraSsn || result.profile.ssn_last4,
      last_employer: extraEmployer || result.profile.last_employer,
      separation_date: extraSeparation || result.profile.separation_date,
    };
    // Re-run prefill mapping locally for the immediate view: shared address/phone
    // values flow through to all forms because the backend already filled them
    // from the intake. We update the selected program's prefilled address so the
    // FormView reflects the just-entered value.
    const updated: MatchedProgram = {
      ...modalProgram,
      prefilled_fields: {
        ...modalProgram.prefilled_fields,
        ...(extraStreet ? { "Street Address": extraStreet } : {}),
        ...(extraSsn ? { "SSN Last 4": extraSsn } : {}),
        ...(extraEmployer ? { "Last Employer Name": extraEmployer } : {}),
        ...(extraSeparation ? { "Date of Separation": extraSeparation } : {}),
      },
    };

    addEnrollment({
      program_name: modalProgram.name,
      enrolled_date: todayIso(),
      renewal_date: modalProgram.renewal_date,
      monthly_value: parseMonthlyValue(modalProgram.monthly_value_estimate),
      reminder_set: false,
      phone: result.profile.phone,
      language,
      status: "active",
    });
    onEnrollmentAdded?.();

    setModalProgram(null);
    onSelectProgram(updated, enriched);
  };

  return (
    <div className="bb-container">
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <h1>{strings.qualifyHeadline(firstName, result.matched_programs.length)}</h1>
        <div style={{
          fontFamily: "DM Serif Display, Georgia, serif",
          fontSize: "3rem",
          color: "var(--bb-green)",
          marginTop: 6,
          letterSpacing: "-0.02em",
        }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "baseline",
              gap: 8,
              padding: "6px 18px",
              borderRadius: 999,
              background: "white",
              border: "1px solid var(--bb-border)",
              boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
            }}
          >
            <CountUp to={totalAll} />
            <span style={{ fontSize: "1rem", color: "var(--bb-text-soft)", fontFamily: "DM Sans, sans-serif" }}>/mo</span>
          </span>
        </div>
        <div style={{ color: "var(--bb-text-soft)", marginTop: 4 }}>
          {strings.worthUpTo(result.total_monthly_estimate)}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 12 }}>
        {visiblePrograms.map((program, i) => (
          <ProgramCard
            key={program.name}
            program={program}
            language={language}
            strings={strings.programCard}
            delayIndex={i}
            onPreFill={() => handlePreFill(program)}
            onSetReminder={() => handleReminder(program)}
            onOpen={() => onSelectProgram(program, result.profile)}
          />
        ))}
      </div>

      {!showAll && remainingCount > 0 && (
        <div style={{ textAlign: "center", marginTop: 10 }}>
          <button
            type="button"
            className="bb-btn bb-btn-ghost"
            onClick={() => setShowAll(true)}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
              View {remainingCount} Additional Local Services
              <IconChevronDown size={18} />
            </span>
          </button>
        </div>
      )}

      <div className="bb-card" style={{ marginTop: 12 }}>
        <DocumentList
          documents={result.master_document_checklist}
          title={strings.docsTitle}
          progressLabel={strings.docsProgress}
        />
      </div>

      <div style={{ textAlign: "center", marginTop: 24 }}>
        <button type="button" className="bb-btn bb-btn-ghost" onClick={onStartOver}>
          {strings.startOver}
        </button>
      </div>

      <div className="bb-disclaimer" style={{ marginTop: 18 }}>
        {result.disclaimer}
      </div>

      {modalProgram && (
        <div className="bb-modal-backdrop" role="dialog" aria-modal="true">
          <div className="bb-modal">
            <h2 style={{ marginTop: 0 }}>{strings.modal.title}</h2>
            <div style={{ color: "var(--bb-text-soft)", marginBottom: 16 }}>{modalProgram.name}</div>

            <div className="bb-field">
              <label className="bb-label">{strings.modal.streetLabel}</label>
              <input
                className="bb-input"
                type="text"
                placeholder={strings.modal.streetPlaceholder}
                value={extraStreet}
                onChange={(e) => setExtraStreet(e.target.value)}
              />
            </div>

            {modalProgram.name === "Unemployment Insurance" && (
              <>
                <div className="bb-field">
                  <label className="bb-label">{strings.modal.ssnLabel}</label>
                  <span className="bb-help">{strings.modal.ssnHelp}</span>
                  <input
                    className="bb-input"
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    value={extraSsn}
                    onChange={(e) => setExtraSsn(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  />
                </div>
                <div className="bb-field">
                  <label className="bb-label">{strings.modal.employerLabel}</label>
                  <input
                    className="bb-input"
                    type="text"
                    value={extraEmployer}
                    onChange={(e) => setExtraEmployer(e.target.value)}
                  />
                </div>
                <div className="bb-field">
                  <label className="bb-label">{strings.modal.separationLabel}</label>
                  <input
                    className="bb-input"
                    type="date"
                    value={extraSeparation}
                    onChange={(e) => setExtraSeparation(e.target.value)}
                  />
                </div>
              </>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              <button type="button" className="bb-btn bb-btn-ghost" onClick={() => setModalProgram(null)}>
                {strings.modal.cancel}
              </button>
              <button type="button" className="bb-btn bb-btn-block" onClick={confirmModal}>
                {strings.modal.confirm}
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        className="bb-support-fab"
        onClick={() => setSupportOpen(true)}
        aria-label="Talk to a Local Expert"
      >
        <span className="bb-support-fab-icon" aria-hidden="true">
          <IconPhone size={24} />
        </span>
        <span className="bb-support-fab-label">Talk to a Local Expert</span>
      </button>

      <SupportModal
        open={supportOpen}
        onClose={() => setSupportOpen(false)}
        profile={result.profile}
        programs={result.matched_programs}
        language={language}
      />

      {toast && <div className="bb-toast">{toast}</div>}
    </div>
  );
}
