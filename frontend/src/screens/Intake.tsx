import { useMemo, useState } from "react";
import VoiceInput from "../components/VoiceInput";
import { IconSparkle } from "../components/icons";
import type { IntakeProfile, Language } from "../api";
import { loadAlexDemoData, loadRosaDemoData } from "../utils/enrollments";

interface Strings {
  questionN: (n: number, total: number) => string;
  back: string;
  next: string;
  findBenefits: string;
  loadDemo: string;
  privacyNote: string;
  q: {
    nameTitle: string;
    namePlaceholder: string;
    dobTitle: string;
    locationTitle: string;
    cityPlaceholder: string;
    zipPlaceholder: string;
    phoneTitle: string;
    phonePlaceholder: string;
    incomeTitle: string;
    incomeHelp: string;
    incomePlaceholder: string;
    householdTitle: string;
    householdHelp: string;
    situationTitle: string;
    situationHelp: string;
    situations: { key: keyof IntakeProfile; label: string }[];
    languageTitle: string;
    languageHelp: string;
  };
}

interface Props {
  language: Language;
  strings: Strings;
  onLanguageChange: (l: Language) => void;
  onSubmit: (profile: IntakeProfile) => void;
  loading: boolean;
  errorMessage: string | null;
  /** After filling Rosa demo intake, sync My Benefits enrollment demo state */
  onRosaDemoPrepared?: () => void;
}

type StepKey =
  | "name"
  | "dob"
  | "student"
  | "workStudy"
  | "calGrant"
  | "mealPlan"
  | "location"
  | "phone"
  | "income"
  | "household"
  | "situation"
  | "language";

const DEMO: IntakeProfile = {
  full_name: "Rosa Martinez",
  date_of_birth: "1966-03-15",
  address: "423 Main Street",
  city: "Woodland",
  zip_code: "95695",
  phone: "+15304441234",
  monthly_income: 0,
  household_size: 1,
  age: 58,
  recently_unemployed: true,
  worked_last_18_months: true,
  self_employed: false,
  citizen_or_legal_resident: true,
  has_disability: false,
  pregnant: false,
  has_children_under_5: false,
  is_student: false,
  work_study: false,
  cal_grant_a_or_b: false,
  works_20_hours_week: false,
  has_dependent_under_12: false,
  meal_plan_count: 0,
  ssn_last4: "4321",
  last_employer: "Sacramento Unified School District",
  separation_date: "2024-11-01",
  language: "en",
};

const ALEX_DEMO: IntakeProfile = {
  full_name: "Alex Chen",
  date_of_birth: "2006-04-12",
  address: "",
  city: "Davis",
  zip_code: "95616",
  phone: "+15305261234",
  monthly_income: 600,
  household_size: 1,
  age: 20,
  recently_unemployed: false,
  worked_last_18_months: false,
  self_employed: false,
  citizen_or_legal_resident: true,
  has_disability: false,
  pregnant: false,
  has_children_under_5: false,
  is_student: true,
  work_study: true,
  cal_grant_a_or_b: true,
  works_20_hours_week: false,
  has_dependent_under_12: false,
  meal_plan_count: 0,
  ssn_last4: "",
  last_employer: "",
  separation_date: "",
  language: "en",
};

function ageFromDob(dob: string): number {
  if (!dob) return 0;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return 0;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age -= 1;
  return age;
}

function digitsOnly(s: string): string {
  return (s || "").replace(/[^\d]/g, "");
}

export default function Intake({ language, strings, onLanguageChange, onSubmit, loading, errorMessage, onRosaDemoPrepared }: Props) {
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<IntakeProfile>({
    ...DEMO,
    full_name: "",
    date_of_birth: "",
    address: "",
    city: "",
    zip_code: "",
    phone: "",
    monthly_income: 0,
    household_size: 1,
    age: 0,
    recently_unemployed: false,
    worked_last_18_months: false,
    self_employed: false,
    citizen_or_legal_resident: false,
    has_disability: false,
    pregnant: false,
    has_children_under_5: false,
    is_student: false,
    work_study: false,
    cal_grant_a_or_b: false,
    works_20_hours_week: false,
    has_dependent_under_12: false,
    meal_plan_count: 0,
    ssn_last4: "",
    last_employer: "",
    separation_date: "",
    language,
  });

  const steps: StepKey[] = useMemo(() => {
    const base: StepKey[] = ["name", "dob", "student"];
    if (profile.is_student) base.push("workStudy", "calGrant", "mealPlan");
    base.push("location", "phone", "income", "household", "situation", "language");
    return base;
  }, [profile.is_student]);

  const update = <K extends keyof IntakeProfile>(key: K, value: IntakeProfile[K]) => {
    setProfile((p) => ({ ...p, [key]: value }));
  };

  const loadDemo = () => {
    loadRosaDemoData();
    setProfile({ ...DEMO, language });
    setStep(Math.max(0, steps.length - 1));
    onRosaDemoPrepared?.();
  };

  const loadStudentDemo = () => {
    loadAlexDemoData();
    setProfile({ ...ALEX_DEMO, language });
    setStep(Math.max(0, steps.length - 1));
    onRosaDemoPrepared?.();
  };

  const isValid = useMemo(() => {
    const k = steps[step];
    switch (k) {
      case "name": return profile.full_name.trim().length > 1;
      case "dob": return !!profile.date_of_birth;
      case "student": return typeof profile.is_student === "boolean";
      case "workStudy": return typeof profile.work_study === "boolean";
      case "calGrant": return typeof profile.cal_grant_a_or_b === "boolean";
      case "mealPlan": return profile.meal_plan_count >= 0;
      case "location": return profile.city.trim().length > 0 && /^\d{5}$/.test(profile.zip_code);
      case "phone": return digitsOnly(profile.phone).length >= 10;
      case "income": return profile.monthly_income >= 0 && !Number.isNaN(profile.monthly_income);
      case "household": return profile.household_size >= 1;
      case "situation": return true;
      case "language": return language === "en" || language === "es";
      default: return false;
    }
  }, [step, profile, language, steps]);

  const goNext = () => {
    if (!isValid) return;
    if (step === steps.length - 1) {
      const finalProfile: IntakeProfile = {
        ...profile,
        language,
        age: ageFromDob(profile.date_of_birth),
      };
      onSubmit(finalProfile);
      return;
    }
    setStep(step + 1);
  };
  const goBack = () => setStep(Math.max(0, step - 1));

  const progressPct = ((step + 1) / steps.length) * 100;

  const renderStep = () => {
    const k = steps[step];
    switch (k) {
      case "name":
        return (
          <div className="bb-field">
            <label className="bb-label">{strings.q.nameTitle}</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                className="bb-input"
                type="text"
                value={profile.full_name}
                placeholder={strings.q.namePlaceholder}
                onChange={(e) => update("full_name", e.target.value)}
                autoFocus
              />
              <VoiceInput
                language={language}
                ariaLabel={language === "es" ? "Di tu nombre" : "Speak your name"}
                onTranscript={(t) => update("full_name", t)}
              />
            </div>
          </div>
        );
      case "dob":
        return (
          <div className="bb-field">
            <label className="bb-label">{strings.q.dobTitle}</label>
            <input
              className="bb-input"
              type="date"
              value={profile.date_of_birth}
              onChange={(e) => update("date_of_birth", e.target.value)}
            />
          </div>
        );
      case "student":
        return (
          <div>
            <label className="bb-label">
              {language === "es" ? "¿Eres estudiante al menos medio tiempo?" : "Are you a student enrolled at least half-time?"}
            </label>
            <div className="bb-row">
              <button
                type="button"
                className={profile.is_student ? "bb-btn bb-btn-block" : "bb-btn bb-btn-secondary bb-btn-block"}
                onClick={() => update("is_student", true)}
              >
                {language === "es" ? "Sí" : "Yes"}
              </button>
              <button
                type="button"
                className={!profile.is_student ? "bb-btn bb-btn-block" : "bb-btn bb-btn-secondary bb-btn-block"}
                onClick={() => update("is_student", false)}
              >
                {language === "es" ? "No" : "No"}
              </button>
            </div>
          </div>
        );
      case "workStudy":
        return (
          <div>
            <label className="bb-label">
              {language === "es" ? "¿Eres elegible para Work-Study?" : "Are you eligible for Work-Study?"}
            </label>
            <div className="bb-row">
              <button
                type="button"
                className={profile.work_study ? "bb-btn bb-btn-block" : "bb-btn bb-btn-secondary bb-btn-block"}
                onClick={() => update("work_study", true)}
              >
                {language === "es" ? "Sí" : "Yes"}
              </button>
              <button
                type="button"
                className={!profile.work_study ? "bb-btn bb-btn-block" : "bb-btn bb-btn-secondary bb-btn-block"}
                onClick={() => update("work_study", false)}
              >
                {language === "es" ? "No" : "No"}
              </button>
            </div>
          </div>
        );
      case "calGrant":
        return (
          <div>
            <label className="bb-label">
              {language === "es" ? "¿Recibes una Cal Grant A o B?" : "Do you receive a Cal Grant A or B?"}
            </label>
            <div className="bb-row">
              <button
                type="button"
                className={profile.cal_grant_a_or_b ? "bb-btn bb-btn-block" : "bb-btn bb-btn-secondary bb-btn-block"}
                onClick={() => update("cal_grant_a_or_b", true)}
              >
                {language === "es" ? "Sí" : "Yes"}
              </button>
              <button
                type="button"
                className={!profile.cal_grant_a_or_b ? "bb-btn bb-btn-block" : "bb-btn bb-btn-secondary bb-btn-block"}
                onClick={() => update("cal_grant_a_or_b", false)}
              >
                {language === "es" ? "No" : "No"}
              </button>
            </div>
          </div>
        );
      case "mealPlan":
        return (
          <div className="bb-field">
            <label className="bb-label">
              {language === "es"
                ? "¿Cuántas comidas por semana incluye tu plan de comidas?"
                : "Do you have a meal plan with 11 or more meals per week?"}
            </label>
            <span className="bb-help">
              {language === "es"
                ? "Ingresa comidas por semana (0 si no tienes plan). 11+ puede descalificar para CalFresh."
                : "Enter meals per week (0 if none). 11+ can disqualify CalFresh."}
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                className="bb-input"
                type="number"
                inputMode="numeric"
                min={0}
                value={profile.meal_plan_count === 0 ? "" : profile.meal_plan_count}
                onChange={(e) => {
                  const v = e.target.value === "" ? 0 : Number(e.target.value);
                  update("meal_plan_count", Number.isNaN(v) ? 0 : Math.max(0, Math.floor(v)));
                }}
              />
              <VoiceInput
                language={language}
                ariaLabel={language === "es" ? "Di tus comidas por semana" : "Speak meals per week"}
                onTranscript={(t) => {
                  const n = Number(digitsOnly(t));
                  update("meal_plan_count", Number.isNaN(n) ? 0 : Math.max(0, Math.floor(n)));
                }}
              />
            </div>
          </div>
        );
      case "location":
        return (
          <div>
            <label className="bb-label">{strings.q.locationTitle}</label>
            <div className="bb-row">
              <input
                className="bb-input"
                type="text"
                placeholder={strings.q.cityPlaceholder}
                value={profile.city}
                onChange={(e) => update("city", e.target.value)}
              />
              <input
                className="bb-input"
                type="text"
                inputMode="numeric"
                placeholder={strings.q.zipPlaceholder}
                value={profile.zip_code}
                maxLength={5}
                onChange={(e) => update("zip_code", digitsOnly(e.target.value).slice(0, 5))}
              />
            </div>
          </div>
        );
      case "phone":
        return (
          <div className="bb-field">
            <label className="bb-label">{strings.q.phoneTitle}</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                className="bb-input"
                type="tel"
                placeholder={strings.q.phonePlaceholder}
                value={profile.phone}
                onChange={(e) => update("phone", e.target.value)}
              />
              <VoiceInput
                language={language}
                ariaLabel={language === "es" ? "Di tu número de teléfono" : "Speak your phone number"}
                onTranscript={(t) => update("phone", "+1" + digitsOnly(t).slice(-10))}
              />
            </div>
          </div>
        );
      case "income":
        return (
          <div className="bb-field">
            <label className="bb-label">{strings.q.incomeTitle}</label>
            <span className="bb-help">{strings.q.incomeHelp}</span>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                className="bb-input"
                type="number"
                inputMode="numeric"
                placeholder={strings.q.incomePlaceholder}
                value={profile.monthly_income === 0 ? "" : profile.monthly_income}
                min={0}
                onChange={(e) => {
                  const v = e.target.value === "" ? 0 : Number(e.target.value);
                  update("monthly_income", Number.isNaN(v) ? 0 : v);
                }}
              />
              <VoiceInput
                language={language}
                ariaLabel={language === "es" ? "Di tu ingreso mensual" : "Speak your income"}
                onTranscript={(t) => {
                  const n = Number(digitsOnly(t));
                  update("monthly_income", Number.isNaN(n) ? 0 : n);
                }}
              />
            </div>
          </div>
        );
      case "household":
        return (
          <div className="bb-field">
            <label className="bb-label">{strings.q.householdTitle}</label>
            <span className="bb-help">{strings.q.householdHelp}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button type="button" className="bb-btn bb-btn-ghost" onClick={() => update("household_size", Math.max(1, profile.household_size - 1))} aria-label="Decrease">−</button>
              <span style={{ fontSize: "2rem", fontFamily: "DM Serif Display, Georgia, serif", minWidth: 60, textAlign: "center" }}>{profile.household_size}</span>
              <button type="button" className="bb-btn bb-btn-ghost" onClick={() => update("household_size", Math.min(8, profile.household_size + 1))} aria-label="Increase">+</button>
            </div>
          </div>
        );
      case "situation":
        return (
          <div>
            <label className="bb-label">{strings.q.situationTitle}</label>
            <span className="bb-help">{strings.q.situationHelp}</span>
            <div>
              {strings.q.situations.map(({ key, label }) => {
                const checked = !!profile[key];
                return (
                  <label
                    key={String(key)}
                    style={{
                      display: "flex",
                      gap: 12,
                      alignItems: "center",
                      padding: "12px 14px",
                      border: "1.5px solid var(--bb-border)",
                      borderRadius: "var(--bb-radius)",
                      marginBottom: 8,
                      background: checked ? "var(--bb-green-soft)" : "white",
                      borderColor: checked ? "var(--bb-green)" : "var(--bb-border)",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      style={{ width: 20, height: 20, accentColor: "var(--bb-green)" }}
                      onChange={(e) => update(key, e.target.checked as any)}
                    />
                    <span>{label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        );
      case "language":
        return (
          <div>
            <label className="bb-label">{strings.q.languageTitle}</label>
            <span className="bb-help">{strings.q.languageHelp}</span>
            <div className="bb-row">
              <button
                type="button"
                className={language === "en" ? "bb-btn bb-btn-block" : "bb-btn bb-btn-secondary bb-btn-block"}
                onClick={() => onLanguageChange("en")}
              >
                English
              </button>
              <button
                type="button"
                className={language === "es" ? "bb-btn bb-btn-block" : "bb-btn bb-btn-secondary bb-btn-block"}
                onClick={() => onLanguageChange("es")}
              >
                Español
              </button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bb-container">
      <div style={{ marginBottom: 18 }}>
        <div className="bb-progress-track">
          <div className="bb-progress-fill" style={{ width: `${progressPct}%` }} />
        </div>
        <div className="bb-progress-label">{strings.questionN(step + 1, steps.length)}</div>
      </div>

      <div className="bb-card">
        {renderStep()}
        {errorMessage && (
          <div style={{ color: "var(--bb-danger)", fontSize: "0.9rem", marginTop: 8 }}>
            {errorMessage}
          </div>
        )}
        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <button
            type="button"
            className="bb-btn bb-btn-ghost"
            onClick={goBack}
            disabled={step === 0 || loading}
          >
            {strings.back}
          </button>
          <button
            type="button"
            className="bb-btn bb-btn-block"
            onClick={goNext}
            disabled={!isValid || loading}
          >
            {loading ? "…" : step === steps.length - 1 ? strings.findBenefits : strings.next}
          </button>
        </div>
      </div>

      <div style={{ textAlign: "center", marginTop: 18 }}>
        <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
          <button type="button" className="bb-btn bb-btn-ghost" onClick={loadDemo}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <IconSparkle size={16} />
              {strings.loadDemo}
            </span>
          </button>
          <button type="button" className="bb-btn bb-btn-ghost" onClick={loadStudentDemo}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <IconSparkle size={16} />
              {language === "es" ? "Cargar demo de estudiante (Alex)" : "Load Student Demo (Alex)"}
            </span>
          </button>
        </div>
      </div>

      <div className="bb-disclaimer">{strings.privacyNote}</div>
    </div>
  );
}
