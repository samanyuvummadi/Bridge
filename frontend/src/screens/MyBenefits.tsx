import { useEffect, useMemo, useState } from "react";
import { IconSprout } from "../components/icons";
import TotalSavedHero from "../components/TotalSavedHero";
import RenewalCard from "../components/RenewalCard";
import RenewalTimeline from "../components/RenewalTimeline";
import type { Language } from "../api";
import {
  calculateTotalSaved,
  clearEnrollments,
  daysUntilRenewal,
  getEnrollments,
  getMonthsTracked,
  loadRosaDemoData,
  updateEnrollment,
  type Enrollment,
} from "../utils/enrollments";
import { setSmsReminder } from "../api";

export default function MyBenefits({
  language,
  onGoFindBenefits,
  refreshToken,
}: {
  language: Language;
  onGoFindBenefits: () => void;
  refreshToken: number;
}) {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setEnrollments(getEnrollments());
  }, [refreshToken]);

  const sortedByUrgency = useMemo(() => {
    return [...enrollments].sort((a, b) => {
      const da = daysUntilRenewal(a.renewal_date);
      const db = daysUntilRenewal(b.renewal_date);
      return da - db;
    });
  }, [enrollments]);

  const totalSaved = useMemo(() => calculateTotalSaved(enrollments), [enrollments]);
  const monthsTracked = useMemo(() => getMonthsTracked(enrollments), [enrollments]);
  const programCount = enrollments.length;

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 3200);
  };

  const handleReminderToggle = async (programName: string, next: boolean) => {
    const current = enrollments.find((e) => e.program_name === programName);
    if (!current) return;

    if (next) {
      try {
        const resp = await setSmsReminder(current.phone, current.program_name, current.renewal_date, current.language);
        updateEnrollment(programName, { reminder_set: !!resp.success });
        setEnrollments(getEnrollments());
        showToast(resp.success ? "Reminder set" : "SMS not configured — deadline saved");
      } catch {
        updateEnrollment(programName, { reminder_set: false });
        setEnrollments(getEnrollments());
        showToast("SMS not configured — deadline saved");
      }
      return;
    }

    updateEnrollment(programName, { reminder_set: false });
    setEnrollments(getEnrollments());
    showToast("Reminder cancelled");
  };

  const handleLoadRosaDemo = () => {
    loadRosaDemoData();
    setEnrollments(getEnrollments());
    showToast(language === "es" ? "Datos demo de Rosa cargados" : "Loaded Rosa demo history");
  };

  const handleClear = () => {
    clearEnrollments();
    setEnrollments([]);
    showToast("Cleared");
  };

  if (enrollments.length === 0) {
    return (
      <div className="bb-container">
        <div className="bb-card" style={{ textAlign: "center", padding: 28 }}>
          <div style={{ marginBottom: 12, color: "var(--bb-green)", display: "flex", justifyContent: "center" }}>
            <IconSprout size={52} />
          </div>
          <h2 style={{ marginTop: 0 }}>{language === "es" ? "Aún no estás rastreando beneficios." : "No benefits tracked yet."}</h2>
          <div style={{ color: "var(--bb-text-soft)", marginBottom: 18 }}>
            {language === "es"
              ? "Completa tu verificación de elegibilidad para empezar a rastrear beneficios y fechas de renovación."
              : "Complete your eligibility check to start tracking your benefits and renewal deadlines."}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "stretch" }}>
            <button type="button" className="bb-btn" onClick={onGoFindBenefits}>
              {language === "es" ? "Ver mi elegibilidad →" : "Check My Eligibility →"}
            </button>
            <button type="button" className="bb-btn bb-btn-secondary bb-btn-block" onClick={handleLoadRosaDemo}>
              {language === "es" ? "Demo: cargar historial de Rosa" : "Demo: Load Rosa's History"}
            </button>
          </div>
        </div>

        {toast && <div className="bb-toast">{toast}</div>}
      </div>
    );
  }

  return (
    <div className="bb-container">
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
        <button type="button" className="bb-btn bb-btn-secondary" onClick={handleLoadRosaDemo}>
          {language === "es" ? "Demo: cargar historial de Rosa" : "Demo: Load Rosa's History"}
        </button>
      </div>

      <TotalSavedHero key={`${refreshToken}-${totalSaved}`} total={totalSaved} programCount={programCount} monthsTracked={monthsTracked} />

      <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
        {sortedByUrgency.map((e) => (
          <RenewalCard
            key={e.program_name}
            enrollment={e}
            language={language}
            onReminderToggle={handleReminderToggle}
          />
        ))}
      </div>

      <RenewalTimeline enrollments={enrollments} />

      <div style={{ textAlign: "center", marginTop: 14 }}>
        <button type="button" className="bb-btn bb-btn-ghost" onClick={handleClear}>
          Clear enrollments
        </button>
      </div>

      {toast && <div className="bb-toast">{toast}</div>}
    </div>
  );
}

