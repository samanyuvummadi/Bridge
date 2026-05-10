import { useMemo, useState } from "react";
import SelectionCard from "../components/SelectionCard";
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
  /** Marks that demo data was used in this session. */
  onDemoUsed?: () => void;
  /** Navigate back to the landing page. */
  onBackToLanding?: () => void;
}

type StepKey =
  | "name"
  | "dob"
  | "status"
  | "studentExemptions"
  | "mealPlan"
  | "location"
  | "phone"
  | "income"
  | "citizenship"
  | "household"
  | "situation"
  | "language";

function buildSteps(p: IntakeProfile): StepKey[] {
  const steps: StepKey[] = ["name", "dob", "status"];
  if (p.is_student) steps.push("studentExemptions", "mealPlan");
  steps.push("location", "phone", "income", "citizenship", "household", "situation", "language");
  return steps;
}

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
  campus_support_program: false,
  works_20_hours_week: false,
  has_dependent_under_12: false,
  meal_plan_count: 0,
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

export default function Intake({ language, strings, onLanguageChange, onSubmit, loading, errorMessage, onRosaDemoPrepared, onDemoUsed, onBackToLanding }: Props) {
  const [step, setStep] = useState(0);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
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
    campus_support_program: false,
    works_20_hours_week: false,
    has_dependent_under_12: false,
    meal_plan_count: 0,
    ssn_last4: "",
    last_employer: "",
    separation_date: "",
    language,
  });

  const update = <K extends keyof IntakeProfile>(key: K, value: IntakeProfile[K]) => {
    setProfile((p) => ({ ...p, [key]: value }));
  };

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2800);
  };

  const steps: StepKey[] = useMemo(() => buildSteps(profile), [profile]);

  const loadDemo = () => {
    loadRosaDemoData();
    const next = { ...DEMO, language };
    setProfile(next);
    setStep(buildSteps(next).length - 1);
    onRosaDemoPrepared?.();
    onDemoUsed?.();
  };

  const isValid = useMemo(() => {
    const k = steps[step];
    switch (k) {
      case "name": return profile.full_name.trim().length > 1;
      case "dob": return !!profile.date_of_birth;
      case "status": return typeof profile.is_student === "boolean";
      case "studentExemptions": return true;
      case "mealPlan": return profile.meal_plan_count >= 0;
      case "location": return profile.city.trim().length > 0 && /^\d{5}$/.test(profile.zip_code);
      case "phone": return digitsOnly(profile.phone).length >= 10;
      case "income": return profile.monthly_income >= 0 && !Number.isNaN(profile.monthly_income);
      case "citizenship": return typeof profile.citizen_or_legal_resident === "boolean";
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
  const goBack = () => {
    if (step === 0) {
      onBackToLanding?.();
      return;
    }
    setStep(step - 1);
  };

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
      case "status":
        return (
          <div>
            <h2 style={{ marginTop: 0 }}>
              {language === "es" ? "Estado actual" : "Current status"}
            </h2>
            <div style={{ color: "var(--bb-text-soft)", marginBottom: 12 }}>
              {language === "es"
                ? "Determinando elegibilidad probable según guías del estado de California."
                : "Determining likely eligibility based on California state guidelines."}
            </div>

            <div className="bb-select-grid">
              <SelectionCard
                title={language === "es" ? "Estudiante (medio tiempo o más)" : "Student (half-time or more)"}
                description={language === "es" ? "Incluye universidades y colegios comunitarios." : "Includes university and community college enrollment."}
                selected={profile.is_student === true}
                onSelect={() => {
                  update("is_student", true);
                  update("recently_unemployed", false);
                  update("worked_last_18_months", false);
                }}
              />
              <SelectionCard
                title={language === "es" ? "Profesional trabajando" : "Working professional"}
                description={language === "es" ? "Empleo actual, ingresos regulares." : "Currently employed with regular income."}
                selected={profile.is_student === false && profile.recently_unemployed === false}
                onSelect={() => {
                  update("is_student", false);
                  update("recently_unemployed", false);
                }}
              />
              <SelectionCard
                title={language === "es" ? "Buscando empleo / otro" : "Seeking employment / other"}
                description={language === "es" ? "Desempleo reciente, búsqueda de trabajo u otra situación." : "Recently unemployed, job-seeking, or other situation."}
                selected={profile.is_student === false && profile.recently_unemployed === true}
                onSelect={() => {
                  update("is_student", false);
                  update("recently_unemployed", true);
                  update("worked_last_18_months", true);
                }}
              />
            </div>
          </div>
        );
      case "studentExemptions": {
        const noneSelected = !profile.work_study && !profile.cal_grant_a_or_b && !profile.campus_support_program;
        return (
          <div>
            <h2 style={{ marginTop: 0 }}>
              {language === "es" ? "Exenciones estándar (estudiantes)" : "Standard exemptions (students)"}
            </h2>
            <div style={{ color: "var(--bb-text-soft)", marginBottom: 12 }}>
              {language === "es"
                ? "Estas exenciones se usan comúnmente en evaluaciones de CalFresh para estudiantes."
                : "These exemptions are commonly used in CalFresh screenings for students."}
            </div>

            <div className="bb-select-grid">
              <SelectionCard
                title={language === "es" ? "Elegible para Federal Work-Study" : "Eligible for Federal Work-Study"}
                description={language === "es" ? "Confirmado por tu oficina de ayuda financiera." : "Confirmed by your financial aid office."}
                selected={profile.work_study}
                onSelect={() => update("work_study", !profile.work_study)}
              />
              <SelectionCard
                title={language === "es" ? "Recipiente de Cal Grant A o B" : "Recipient of Cal Grant A or B"}
                description={language === "es" ? "Ayuda estatal; aparece en tu paquete de ayuda." : "State aid shown in your award package."}
                selected={profile.cal_grant_a_or_b}
                onSelect={() => update("cal_grant_a_or_b", !profile.cal_grant_a_or_b)}
              />
              <SelectionCard
                title={language === "es" ? "Programa de apoyo del campus (EOPS, Puente, etc.)" : "Campus support program (EOPS, Puente, etc.)"}
                description={language === "es" ? "No cambia todos los casos, pero ayuda a contextualizar tu situación." : "Helps contextualize your situation."}
                selected={profile.campus_support_program}
                onSelect={() => update("campus_support_program", !profile.campus_support_program)}
              />
              <SelectionCard
                title={language === "es" ? "Ninguna de las anteriores" : "None of the above"}
                description={language === "es" ? "Puedes continuar; esto solo afecta algunas reglas para estudiantes." : "You can continue; this only affects some student rules."}
                selected={noneSelected}
                onSelect={() => {
                  update("work_study", false);
                  update("cal_grant_a_or_b", false);
                  update("campus_support_program", false);
                }}
              />
            </div>
          </div>
        );
      }
      case "mealPlan":
        return (
          <div>
            <h2 style={{ marginTop: 0 }}>
              {language === "es" ? "Plan de comidas" : "Meal plan"}
            </h2>
            <div style={{ color: "var(--bb-text-soft)", marginBottom: 12 }}>
              {language === "es"
                ? "Si tu plan cubre 11+ comidas por semana, puede descalificar para CalFresh."
                : "If your plan provides 11+ meals per week, it can disqualify CalFresh."}
            </div>

            <div className="bb-select-grid">
              <SelectionCard
                title={language === "es" ? "Sí, 11 o más por semana" : "Yes, 11 or more per week"}
                description={language === "es" ? "Incluye planes residenciales y de comedor." : "Includes common dorm/dining hall plans."}
                selected={profile.meal_plan_count >= 11}
                onSelect={() => update("meal_plan_count", 11)}
              />
              <SelectionCard
                title={language === "es" ? "No" : "No"}
                description={language === "es" ? "Sin plan o menos de 11 comidas por semana." : "No plan, or fewer than 11 meals per week."}
                selected={profile.meal_plan_count < 11}
                onSelect={() => update("meal_plan_count", 0)}
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
            <div style={{ color: "var(--bb-text-soft)", fontSize: "0.85rem", marginBottom: 10 }}>
              {language === "es"
                ? "La información se procesa localmente para determinar coincidencias y no se guarda en una base de datos."
                : "Information is processed locally to determine matches and is not stored on a database."}
            </div>
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
      case "citizenship":
        return (
          <div>
            <h2 style={{ marginTop: 0 }}>
              {language === "es" ? "Estatus de residencia" : "Residency status"}
            </h2>
            <div style={{ color: "var(--bb-text-soft)", marginBottom: 12 }}>
              {language === "es"
                ? "Se usa solo para la evaluación. No se guarda en una base de datos."
                : "Used only for screening. Not stored on a database."}
            </div>
            <div className="bb-select-grid">
              <SelectionCard
                title={language === "es" ? "Ciudadano/a o residente legal permanente" : "U.S. citizen or legal permanent resident"}
                description={language === "es" ? "Esto puede afectar algunos programas." : "This can affect some programs."}
                selected={profile.citizen_or_legal_resident === true}
                onSelect={() => update("citizen_or_legal_resident", true)}
              />
              <SelectionCard
                title={language === "es" ? "Otro / prefiero no decir" : "Other / prefer not to say"}
                description={language === "es" ? "Aún puedes calificar para varios programas en CA." : "You may still qualify for multiple programs in CA."}
                selected={profile.citizen_or_legal_resident === false}
                onSelect={() => update("citizen_or_legal_resident", false)}
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
            <h2 style={{ marginTop: 0 }}>
              {language === "es" ? "Situación del hogar y trabajo" : "Household and work situation"}
            </h2>
            <div style={{ color: "var(--bb-text-soft)", marginBottom: 12 }}>
              {language === "es"
                ? "Esto ayuda a aplicar reglas estándar de elegibilidad del condado."
                : "This helps apply standard County eligibility rules."}
            </div>

            <div className="bb-select-grid">
              {strings.q.situations
                .filter(({ key }) => key !== "citizen_or_legal_resident")
                .map(({ key, label }) => (
                  <SelectionCard
                    key={String(key)}
                    title={label}
                    selected={!!profile[key]}
                    onSelect={() => update(key, (!profile[key]) as any)}
                  />
                ))}

              <SelectionCard
                title={language === "es" ? "Trabajo 20+ horas por semana" : "Work 20+ hours per week"}
                description={language === "es" ? "Puede afectar elegibilidad de estudiantes para CalFresh." : "Can affect CalFresh student eligibility."}
                selected={profile.works_20_hours_week}
                onSelect={() => update("works_20_hours_week", !profile.works_20_hours_week)}
              />
              <SelectionCard
                title={language === "es" ? "Tengo un dependiente menor de 12" : "I have a dependent under 12"}
                description={language === "es" ? "Puede ser una exención para estudiantes en CalFresh." : "May be a CalFresh student exemption."}
                selected={profile.has_dependent_under_12}
                onSelect={() => update("has_dependent_under_12", !profile.has_dependent_under_12)}
              />
            </div>
          </div>
        );
      case "language":
        return (
          <div>
            <label className="bb-label">{strings.q.languageTitle}</label>
            <span className="bb-help">{strings.q.languageHelp}</span>
            <div className="bb-row" style={{ alignItems: "stretch" }}>
              <button
                type="button"
                className={language === "en" ? "bb-btn bb-btn-block" : "bb-btn bb-btn-secondary bb-btn-block"}
                onClick={() => onLanguageChange("en")}
              >
                English
              </button>
              <div style={{ position: "relative", flex: 1 }}>
                <button
                  type="button"
                  className={language === "es" ? "bb-btn bb-btn-block" : "bb-btn bb-btn-secondary bb-btn-block"}
                  onClick={() => setLangMenuOpen((v) => !v)}
                  aria-haspopup="listbox"
                  aria-expanded={langMenuOpen}
                >
                  Español ▾
                </button>
                {langMenuOpen && (
                  <div
                    role="listbox"
                    aria-label="Language options"
                    style={{
                      position: "absolute",
                      top: "calc(100% + 8px)",
                      left: 0,
                      right: 0,
                      background: "white",
                      border: "1px solid var(--bb-border)",
                      borderRadius: 12,
                      boxShadow: "0 8px 28px rgba(0,0,0,0.10)",
                      padding: 6,
                      zIndex: 5,
                    }}
                  >
                    {[
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
                    ].map((opt) => (
                      <button
                        key={opt.key}
                        type="button"
                        role="option"
                        className="bb-btn bb-btn-ghost bb-btn-block"
                        style={{
                          justifyContent: "flex-start",
                          padding: "10px 12px",
                          borderRadius: 10,
                          border: "1px solid transparent",
                        }}
                        onClick={() => {
                          setLangMenuOpen(false);
                          if (opt.key === "es") {
                            onLanguageChange("es");
                          } else {
                            showToast(language === "es" ? "Próximamente" : "Coming soon");
                          }
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
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
            disabled={loading}
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
        </div>
      </div>

      <div className="bb-disclaimer">{strings.privacyNote}</div>

      {toast && <div className="bb-toast">{toast}</div>}
    </div>
  );
}
