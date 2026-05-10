import { useState } from "react";
import Intake from "./screens/Intake";
import Results from "./screens/Results";
import FormView from "./screens/FormView";
import LanguageToggle from "./components/LanguageToggle";
import { submitIntake } from "./api";
import type { IntakeProfile, IntakeResponse, Language, MatchedProgram } from "./api";

type Screen = "intake" | "results" | "formview";

const STRINGS = {
  en: {
    appName: "BenefitBridge",
    tagline: "Find the benefits you've earned.",
    intake: {
      questionN: (n: number, total: number) => `Question ${n} of ${total}`,
      back: "Back",
      next: "Next",
      findBenefits: "Find My Benefits",
      loadDemo: "Load Demo Profile (Rosa)",
      privacyNote: "BenefitBridge does not store your personal information beyond this session. Citizenship status is used only to match programs and is never stored.",
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
      disclaimer: "BenefitBridge is a screening tool, not a legal benefits determination. Your eligibility is confirmed when you complete the official application.",
    },
    intakeError: "Couldn't reach the BenefitBridge service. Please try again.",
  },
  es: {
    appName: "BenefitBridge",
    tagline: "Encuentra los beneficios que te mereces.",
    intake: {
      questionN: (n: number, total: number) => `Pregunta ${n} de ${total}`,
      back: "Atrás",
      next: "Siguiente",
      findBenefits: "Encontrar Mis Beneficios",
      loadDemo: "Cargar perfil de demostración (Rosa)",
      privacyNote: "BenefitBridge no guarda tu información personal más allá de esta sesión. El estado de ciudadanía se usa solo para emparejar programas y nunca se almacena.",
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
      disclaimer: "BenefitBridge es una herramienta de evaluación, no una determinación oficial. Tu elegibilidad se confirma al completar la solicitud oficial.",
    },
    intakeError: "No pudimos conectar con el servicio. Por favor intenta de nuevo.",
  },
};

export default function App() {
  const [screen, setScreen] = useState<Screen>("intake");
  const [language, setLanguage] = useState<Language>("en");
  const [result, setResult] = useState<IntakeResponse | null>(null);
  const [selectedProgram, setSelectedProgram] = useState<MatchedProgram | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<IntakeProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const t = STRINGS[language];

  const handleSubmit = async (profile: IntakeProfile) => {
    setLoading(true);
    setError(null);
    try {
      const resp = await submitIntake({ ...profile, language });
      setResult(resp);
      setScreen("results");
    } catch (e: any) {
      setError(t.intakeError);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProgram = (program: MatchedProgram, profile: IntakeProfile) => {
    setSelectedProgram(program);
    setSelectedProfile(profile);
    setScreen("formview");
  };

  const handleStartOver = () => {
    setResult(null);
    setSelectedProgram(null);
    setSelectedProfile(null);
    setScreen("intake");
  };

  return (
    <div className="bb-app">
      <header className="bb-header">
        <div>
          <div className="bb-brand">{t.appName}</div>
          <div style={{ fontSize: "0.85rem", color: "var(--bb-text-soft)" }}>{t.tagline}</div>
        </div>
        <LanguageToggle value={language} onChange={setLanguage} />
      </header>

      {loading && (
        <div className="bb-container" aria-live="polite">
          <div className="bb-card" style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "DM Serif Display, Georgia, serif", fontSize: "1.5rem", color: "var(--bb-green)" }}>
              {language === "es" ? "Buscando programas para los que calificas…" : "Searching for programs you qualify for…"}
            </div>
          </div>
        </div>
      )}

      {!loading && screen === "intake" && (
        <Intake
          language={language}
          strings={t.intake}
          onLanguageChange={setLanguage}
          onSubmit={handleSubmit}
          loading={loading}
          errorMessage={error}
        />
      )}

      {!loading && screen === "results" && result && (
        <Results
          result={result}
          language={language}
          strings={t.results}
          onSelectProgram={handleSelectProgram}
          onStartOver={handleStartOver}
        />
      )}

      {!loading && screen === "formview" && selectedProgram && selectedProfile && (
        <FormView
          program={selectedProgram}
          profile={selectedProfile}
          language={language}
          strings={t.formview}
          onBack={() => setScreen("results")}
        />
      )}
    </div>
  );
}
