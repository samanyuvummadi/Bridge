import { useEffect, useState } from "react";
import Landing from "./screens/Landing";
import Intake from "./screens/Intake";
import Results from "./screens/Results";
import FormView from "./screens/FormView";
import MyBenefits from "./screens/MyBenefits";
import LanguageToggle from "./components/LanguageToggle";
import { IconBenefitsWallet, IconLogo, IconSearch } from "./components/icons";
import { submitIntake } from "./api";
import type { IntakeProfile, IntakeResponse, Language, MatchedProgram } from "./api";
import { clearEnrollments, getEnrollmentSource } from "./utils/enrollments";

type Screen = "LANDING" | "INTAKE" | "RESULTS" | "FORMVIEW";
type Tab = "find" | "my";

const STRINGS = {
  en: {
    appName: "Bridge",
    tagline: "Find the benefits you've earned.",
    intake: {
      questionN: (n: number, total: number) => `Question ${n} of ${total}`,
      back: "Back",
      next: "Next",
      findBenefits: "Find My Benefits",
      loadDemo: "Load Demo Profile (Rosa)",
      privacyNote: "Bridge does not store your personal information beyond this session. Citizenship status is used only to match programs and is never stored.",
      q: {
        nameTitle: "What's your full name?",
        namePlaceholder: "First and last name",
        dobTitle: "When were you born?",
        locationTitle: "Where do you live?",
        cityPlaceholder: "City",
        zipPlaceholder: "ZIP",
        phoneTitle: "What's your phone number?",
        phonePlaceholder: "(555) 123-4567",
        incomeTitle: "What's your monthly household income?",
        incomeHelp: "Include wages, child support, or any other money coming in. If you have no income, enter 0.",
        incomePlaceholder: "0 if none",
        householdTitle: "How many people live with you?",
        householdHelp: "Count yourself, plus anyone who shares expenses with you.",
        situationTitle: "Which of these are true for you?",
        situationHelp: "Check all that apply. Citizenship is used only to match programs and is never stored.",
        situations: [
          { key: "recently_unemployed", label: "I recently lost a job" },
          { key: "worked_last_18_months", label: "I worked at a job in the last 18 months" },
          { key: "self_employed", label: "I'm self-employed or a contractor" },
          { key: "has_disability", label: "I have a disability that limits work" },
          { key: "pregnant", label: "I'm currently pregnant" },
          { key: "has_children_under_5", label: "I have a child under 5" },
          { key: "citizen_or_legal_resident", label: "I'm a U.S. citizen or legal permanent resident" },
        ] as { key: keyof IntakeProfile; label: string }[],
        languageTitle: "Which language do you prefer?",
        languageHelp: "We'll use this for explanations and reminders.",
      },
    },
    results: {
      qualifyHeadline: (firstName: string, count: number) =>
        `${firstName}, you likely qualify for ${count} ${count === 1 ? "program" : "programs"}`,
      worthUpTo: (total: string) => `Combined value: ${total}`,
      programCard: {
        high: "High match",
        medium: "Likely match",
        low: "Possible match",
        monthly: "/month",
        learnMore: "Learn more",
        hide: "Hide details",
        prefill: "Pre-fill My Application",
        remind: "Set Reminder",
        agency: "Agency",
        renewal: "Renewal",
      },
      docsTitle: "Documents to gather for all your applications",
      docsProgress: (g: number, t: number) => `${g} of ${t} gathered`,
      startOver: "Start over",
      reminderSet: (date: string) => `Reminder set for ${date}`,
      reminderUnavailable: "SMS reminder isn't configured for this demo, but we've noted the deadline.",
      modal: {
        title: "A few more details",
        streetLabel: "Street address",
        streetPlaceholder: "123 Main Street",
        ssnLabel: "Last 4 of SSN",
        ssnHelp: "Required for unemployment claims. Used in this session only — never stored.",
        employerLabel: "Last employer name",
        separationLabel: "Last day of work",
        cancel: "Cancel",
        confirm: "Open Pre-Filled Application",
      },
    },
    formview: {
      back: "Back to results",
      yourInfo: "Your Information (Pre-Filled)",
      yourInfoNote: "Highlighted fields were filled in for you from your intake answers.",
      documents: "Documents You Need",
      docsProgress: (g: number, t: number) => `${g} of ${t} gathered`,
      howToApply: "How to Apply",
      agency: "Agency",
      applyButton: "Continue to Official Application →",
      downloadPdf: "Download PDF Summary",
      downloadFailed: "Could not download PDF",
      disclaimer: "Bridge is a screening tool, not a legal benefits determination. Your eligibility is confirmed when you complete the official application.",
    },
    tabs: {
      find: "Find Benefits",
      my: "My Benefits",
    },
    intakeError: "Couldn't reach the Bridge service. Please try again.",
  },
  es: {
    appName: "Bridge",
    tagline: "Encuentra los beneficios que te mereces.",
    intake: {
      questionN: (n: number, total: number) => `Pregunta ${n} de ${total}`,
      back: "Atrás",
      next: "Siguiente",
      findBenefits: "Encontrar Mis Beneficios",
      loadDemo: "Cargar perfil de demostración (Rosa)",
      privacyNote: "Bridge no guarda tu información personal más allá de esta sesión. El estado de ciudadanía se usa solo para emparejar programas y nunca se almacena.",
      q: {
        nameTitle: "¿Cuál es tu nombre completo?",
        namePlaceholder: "Nombre y apellido",
        dobTitle: "¿Cuándo naciste?",
        locationTitle: "¿Dónde vives?",
        cityPlaceholder: "Ciudad",
        zipPlaceholder: "Código Postal",
        phoneTitle: "¿Cuál es tu número de teléfono?",
        phonePlaceholder: "(555) 123-4567",
        incomeTitle: "¿Cuál es el ingreso mensual de tu hogar?",
        incomeHelp: "Incluye salarios, manutención de hijos o cualquier otro dinero. Si no tienes ingresos, pon 0.",
        incomePlaceholder: "0 si ninguno",
        householdTitle: "¿Cuántas personas viven contigo?",
        householdHelp: "Cuéntate a ti, más cualquier persona que comparta gastos contigo.",
        situationTitle: "¿Cuáles de estas son ciertas para ti?",
        situationHelp: "Marca todas las que apliquen. La ciudadanía solo se usa para emparejar programas y nunca se guarda.",
        situations: [
          { key: "recently_unemployed", label: "Recientemente perdí mi trabajo" },
          { key: "worked_last_18_months", label: "Trabajé en algún empleo en los últimos 18 meses" },
          { key: "self_employed", label: "Trabajo por cuenta propia o como contratista" },
          { key: "has_disability", label: "Tengo una discapacidad que limita mi trabajo" },
          { key: "pregnant", label: "Estoy embarazada" },
          { key: "has_children_under_5", label: "Tengo un hijo menor de 5 años" },
          { key: "citizen_or_legal_resident", label: "Soy ciudadano de EE.UU. o residente permanente legal" },
        ] as { key: keyof IntakeProfile; label: string }[],
        languageTitle: "¿Qué idioma prefieres?",
        languageHelp: "Usaremos este idioma para explicaciones y recordatorios.",
      },
    },
    results: {
      qualifyHeadline: (firstName: string, count: number) =>
        `${firstName}, probablemente calificas para ${count} ${count === 1 ? "programa" : "programas"}`,
      worthUpTo: (total: string) => `Valor combinado: ${total}`,
      programCard: {
        high: "Alta coincidencia",
        medium: "Probable",
        low: "Posible",
        monthly: "/mes",
        learnMore: "Más información",
        hide: "Ocultar detalles",
        prefill: "Llenar mi solicitud",
        remind: "Recordarme",
        agency: "Agencia",
        renewal: "Renovación",
      },
      docsTitle: "Documentos para todas tus solicitudes",
      docsProgress: (g: number, t: number) => `${g} de ${t} reunidos`,
      startOver: "Empezar de nuevo",
      reminderSet: (date: string) => `Recordatorio listo para el ${date}`,
      reminderUnavailable: "El recordatorio por SMS no está configurado en esta demo, pero anotamos la fecha.",
      modal: {
        title: "Unos detalles más",
        streetLabel: "Dirección",
        streetPlaceholder: "Calle 123",
        ssnLabel: "Últimos 4 del SSN",
        ssnHelp: "Necesario para desempleo. Se usa solo en esta sesión, nunca se guarda.",
        employerLabel: "Último empleador",
        separationLabel: "Último día de trabajo",
        cancel: "Cancelar",
        confirm: "Abrir solicitud rellenada",
      },
    },
    formview: {
      back: "Volver a resultados",
      yourInfo: "Tu información (rellenada)",
      yourInfoNote: "Los campos resaltados se rellenaron a partir de tus respuestas.",
      documents: "Documentos que necesitas",
      docsProgress: (g: number, t: number) => `${g} de ${t} reunidos`,
      howToApply: "Cómo aplicar",
      agency: "Agencia",
      applyButton: "Continuar a la solicitud oficial →",
      downloadPdf: "Descargar PDF",
      downloadFailed: "No se pudo descargar el PDF",
      disclaimer: "Bridge es una herramienta de evaluación, no una determinación oficial. Tu elegibilidad se confirma al completar la solicitud oficial.",
    },
    tabs: {
      find: "Encontrar",
      my: "Mis beneficios",
    },
    intakeError: "No pudimos conectar con el servicio de Bridge. Por favor intenta de nuevo.",
  },
};

export default function App() {
  const [tab, setTab] = useState<Tab>("find");
  const [screen, setScreen] = useState<Screen>("LANDING");
  const [language, setLanguage] = useState<Language>("en");
  const [result, setResult] = useState<IntakeResponse | null>(null);
  const [selectedProgram, setSelectedProgram] = useState<MatchedProgram | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<IntakeProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enrollmentsRefreshToken, setEnrollmentsRefreshToken] = useState(0);
  const [demoUsedThisSession, setDemoUsedThisSession] = useState(false);

  const t = STRINGS[language];

  useEffect(() => {
    // Default behavior: start with an empty "My Benefits" unless the user
    // has explicitly enrolled (via pre-fill). Prevent stale/demo localStorage
    // from appearing by default on refresh.
    if (getEnrollmentSource() !== "user") {
      clearEnrollments();
      bumpEnrollments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (profile: IntakeProfile) => {
    setLoading(true);
    setError(null);
    try {
      // If the user ran a normal intake (no demo buttons), ensure My Benefits starts empty.
      // Enrollments are only created when the user clicks "Pre-fill My Application" later.
      if (!demoUsedThisSession) {
        clearEnrollments();
        bumpEnrollments();
      }
      const resp = await submitIntake({ ...profile, language });
      setResult(resp);
      setScreen("RESULTS");
    } catch (e: any) {
      const detail =
        typeof e?.message === "string" && e.message.trim().length > 0
          ? ` (${e.message})`
          : "";
      setError(t.intakeError + detail);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProgram = (program: MatchedProgram, profile: IntakeProfile) => {
    setSelectedProgram(program);
    setSelectedProfile(profile);
    setScreen("FORMVIEW");
  };

  const bumpEnrollments = () => setEnrollmentsRefreshToken((v) => v + 1);

  const handleStartOver = () => {
    setResult(null);
    setSelectedProgram(null);
    setSelectedProfile(null);
    setScreen("LANDING");
    setDemoUsedThisSession(false);
  };

  const startAssessment = () => {
    clearEnrollments();
    bumpEnrollments();
    setDemoUsedThisSession(false);
    setResult(null);
    setSelectedProgram(null);
    setSelectedProfile(null);
    setTab("find");
    setScreen("INTAKE");
  };

  const meetRosa = async () => {
    clearEnrollments();
    bumpEnrollments();
    setDemoUsedThisSession(true);
    setError(null);
    setLoading(true);
    setTab("find");
    const rosa: IntakeProfile = {
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
      language,
    };
    try {
      const resp = await submitIntake({ ...rosa, language });
      setResult(resp);
      setScreen("RESULTS");
    } catch {
      setError(t.intakeError);
      setScreen("LANDING");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bb-app">
      <header className="bb-header">
        <div>
          <div className="bb-brand" style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
            <span style={{ color: "#1B4332", display: "inline-flex", alignItems: "center" }} aria-hidden="true">
              <IconLogo size={24} />
            </span>
            {t.appName}
          </div>
          <div style={{ fontSize: "0.85rem", color: "var(--bb-text-soft)" }}>{t.tagline}</div>
        </div>
        <LanguageToggle value={language} onChange={setLanguage} />
      </header>

      <nav className="bb-tabbar bb-tabbar-top" role="navigation" aria-label="Primary">
        <button
          type="button"
          className={`bb-tab ${tab === "find" ? "bb-tab-active" : ""}`}
          onClick={() => setTab("find")}
        >
          <span className="bb-tab-icon">
            <IconSearch size={22} />
          </span>
          <span className="bb-tab-label">{t.tabs.find}</span>
        </button>
        <button
          type="button"
          className={`bb-tab ${tab === "my" ? "bb-tab-active" : ""}`}
          onClick={() => {
            bumpEnrollments();
            setTab("my");
          }}
        >
          <span className="bb-tab-icon">
            <IconBenefitsWallet size={22} />
          </span>
          <span className="bb-tab-label">{t.tabs.my}</span>
        </button>
      </nav>

      {loading && (
        <div className="bb-container" aria-live="polite">
          <div className="bb-card" style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "DM Serif Display, Georgia, serif", fontSize: "1.5rem", color: "var(--bb-green)" }}>
              {language === "es" ? "Buscando programas para los que calificas…" : "Searching for programs you qualify for…"}
            </div>
          </div>
        </div>
      )}

      <main style={{ flex: 1 }}>
        {!loading && tab === "find" && screen === "LANDING" && (
          <Landing
            language={language}
            onStartAssessment={startAssessment}
            onMeetRosa={meetRosa}
          />
        )}

        {!loading && tab === "find" && screen === "INTAKE" && (
          <Intake
            language={language}
            strings={t.intake}
            onLanguageChange={setLanguage}
            onSubmit={handleSubmit}
            loading={loading}
            errorMessage={error}
            onRosaDemoPrepared={bumpEnrollments}
            onDemoUsed={() => setDemoUsedThisSession(true)}
            onBackToLanding={() => setScreen("LANDING")}
          />
        )}

        {!loading && tab === "find" && screen === "RESULTS" && result && (
          <Results
            result={result}
            language={language}
            strings={t.results}
            onSelectProgram={handleSelectProgram}
            onStartOver={handleStartOver}
            onEnrollmentAdded={bumpEnrollments}
          />
        )}

        {!loading && tab === "find" && screen === "FORMVIEW" && selectedProgram && selectedProfile && (
          <FormView
            program={selectedProgram}
            profile={selectedProfile}
            language={language}
            strings={t.formview}
            onBack={() => setScreen("RESULTS")}
          />
        )}

        {!loading && tab === "my" && (
          <MyBenefits
            language={language}
            refreshToken={enrollmentsRefreshToken}
            onGoFindBenefits={() => {
              setTab("find");
              setScreen("LANDING");
            }}
          />
        )}
      </main>
    </div>
  );
}
