import type { Language } from "../api";

export default function Landing({
  language,
  onStartAssessment,
  onMeetRosa,
}: {
  language: Language;
  onStartAssessment: () => void;
  onMeetRosa: () => void;
}) {
  const t = language === "es"
    ? {
        title: "Bienvenido a BenefitBridge",
        subtitle: "Descubre y mantén los beneficios que te has ganado. Toma aproximadamente 2 minutos.",
        privateB: "Tus datos se quedan en tu dispositivo.",
        localizedB: "Creado específicamente para residentes de Sacramento y el condado de Yolo.",
        start: "Comenzar mi evaluación",
        demoTitle: "Perfiles de demostración",
        demoRosa: "Rosa (adulta mayor en Woodland)",
      }
    : {
        title: "Welcome to BenefitBridge",
        subtitle: "Discover and maintain the benefits you’ve earned. It takes about 2 minutes.",
        privateB: "Your data stays on your device.",
        localizedB: "Built specifically for Sacramento & Yolo County residents.",
        start: "Start My Assessment",
        demoTitle: "Demo Profiles",
        demoRosa: "Rosa (Senior in Woodland)",
      };

  return (
    <div className="bb-container">
      <div style={{ textAlign: "center", marginBottom: 18 }}>
        <h1 style={{ color: "#1B4332", marginBottom: 8 }}>{t.title}</h1>
        <div style={{ color: "var(--bb-text-soft)", maxWidth: 560, margin: "0 auto" }}>
          {t.subtitle}
        </div>
      </div>

      <div className="bb-card">
        <div style={{ display: "grid", gap: 10 }}>
          <button type="button" className="bb-btn bb-btn-block" onClick={onStartAssessment}>
            {t.start}
          </button>

          <ul style={{ margin: 0, paddingLeft: 18, color: "var(--bb-text-soft)", fontSize: "0.9rem" }}>
            <li style={{ margin: "6px 0" }}>{t.privateB}</li>
            <li style={{ margin: "6px 0" }}>{t.localizedB}</li>
          </ul>
        </div>
      </div>

      <div className="bb-card" style={{ borderStyle: "dashed" }}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>{t.demoTitle}</div>
        <button type="button" className="bb-btn bb-btn-secondary bb-btn-block" onClick={onMeetRosa}>
          {t.demoRosa}
        </button>
      </div>
    </div>
  );
}

