import { useMemo, useState } from "react";
import VoiceInput from "../components/VoiceInput";
import { IconSparkle } from "../components/icons";
import type { IntakeProfile, Language } from "../api";
import { loadRosaDemoData } from "../utils/enrollments";

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

const TOTAL = 8;

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
  ssn_last4: "4321",
  last_employer: "Sacramento Unified School District",
  separation_date: "2024-11-01",
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
  const [profile, setProfile] = useState<IntakeProfile>({ ...DEMO, full_name: "", date_of_birth: "", address: "", city: "", zip_code: "", phone: "", monthly_income: 0, household_size: 1, age: 0, recently_unemployed: false, worked_last_18_months: false, self_employed: false, citizen_or_legal_resident: false, has_disability: false, pregnant: false, has_children_under_5: false, ssn_last4: "", last_employer: "", separation_date: "", language });

  const update = <K extends keyof IntakeProfile>(key: K, value: IntakeProfile[K]) => {
    setProfile((p) => ({ ...p, [key]: value }));
  };

  const loadDemo = () => {
    loadRosaDemoData();
    setProfile({ ...DEMO, language });
    setStep(TOTAL - 1);
    onRosaDemoPrepared?.();
  };

  const isValid = useMemo(() => {
    switch (step) {
      case 0: return profile.full_name.trim().length > 1;
      case 1: return !!profile.date_of_birth;
      case 2: return profile.city.trim().length > 0 && /^\d{5}$/.test(profile.zip_code);
      case 3: return digitsOnly(profile.phone).length >= 10;
      case 4: return profile.monthly_income >= 0 && !Number.isNaN(profile.monthly_income);
      case 5: return profile.household_size >= 1;
      case 6: return true; // checkboxes always allowed
      case 7: return language === "en" || language === "es";
      default: return false;
    }
  }, [step, profile, language]);

  const goNext = () => {
    if (!isValid) return;
    if (step === TOTAL - 1) {
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

  const progressPct = ((step + 1) / TOTAL) * 100;

  const renderStep = () => {
    switch (step) {
      case 0:
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
                ariaLabel="Speak your name"
                onTranscript={(t) => update("full_name", t)}
              />
            </div>
          </div>
        );
      case 1:
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
      case 2:
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
      case 3:
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
                ariaLabel="Speak your phone number"
                onTranscript={(t) => update("phone", "+1" + digitsOnly(t).slice(-10))}
              />
            </div>
          </div>
        );
      case 4:
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
                ariaLabel="Speak your income"
                onTranscript={(t) => {
                  const n = Number(digitsOnly(t));
                  update("monthly_income", Number.isNaN(n) ? 0 : n);
                }}
              />
            </div>
          </div>
        );
      case 5:
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
      case 6:
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
      case 7:
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
        <div className="bb-progress-label">{strings.questionN(step + 1, TOTAL)}</div>
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
            {loading ? "…" : step === TOTAL - 1 ? strings.findBenefits : strings.next}
          </button>
        </div>
      </div>

      <div style={{ textAlign: "center", marginTop: 18 }}>
        <button
          type="button"
          className="bb-btn bb-btn-ghost"
          onClick={loadDemo}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <IconSparkle size={16} />
            {strings.loadDemo}
          </span>
        </button>
      </div>

      <div className="bb-disclaimer">{strings.privacyNote}</div>
    </div>
  );
}
