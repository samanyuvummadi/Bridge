import { useState } from "react";
import DocumentList from "../components/DocumentList";
import { downloadFormPdf } from "../api";
import type { IntakeProfile, Language, MatchedProgram } from "../api";

interface Strings {
  back: string;
  yourInfo: string;
  yourInfoNote: string;
  documents: string;
  docsProgress: (gathered: number, total: number) => string;
  howToApply: string;
  agency: string;
  applyButton: string;
  downloadPdf: string;
  downloadFailed: string;
  disclaimer: string;
}

interface Props {
  program: MatchedProgram;
  profile: IntakeProfile;
  language: Language;
  strings: Strings;
  onBack: () => void;
}

export default function FormView({ program, profile, strings, onBack }: Props) {
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const handleDownload = async () => {
    setDownloading(true);
    setDownloadError(null);
    try {
      const blob = await downloadFormPdf(program.name, profile);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `BenefitBridge_${program.name.replace(/\s+/g, "_")}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setDownloadError(e?.message || strings.downloadFailed);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="bb-container">
      <button type="button" className="bb-btn bb-btn-ghost" onClick={onBack} style={{ marginBottom: 16 }}>
        ← {strings.back}
      </button>

      <h1>{program.name}</h1>
      <div style={{ color: "var(--bb-text-soft)", marginBottom: 4 }}>{program.agency}</div>
      <a href={program.apply_url} target="_blank" rel="noreferrer">{program.apply_url}</a>

      <div className="bb-card" style={{ marginTop: 18 }}>
        <h3 style={{ marginTop: 0 }}>{strings.yourInfo}</h3>
        <span className="bb-help">{strings.yourInfoNote}</span>
        <table className="bb-prefill-table">
          <tbody>
            {Object.entries(program.prefilled_fields).map(([k, v]) => (
              <tr key={k}>
                <td className="bb-prefill-key">{k}</td>
                <td className="bb-prefill-val">{v || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bb-card">
        <DocumentList
          documents={program.documents_needed}
          title={strings.documents}
          progressLabel={strings.docsProgress}
        />
      </div>

      <div className="bb-card">
        <h3 style={{ marginTop: 0 }}>{strings.howToApply}</h3>
        <div style={{ marginBottom: 6, color: "var(--bb-text-soft)" }}>
          {strings.agency}: {program.agency}
        </div>
        <a className="bb-btn bb-btn-block" href={program.apply_url} target="_blank" rel="noreferrer" style={{ textDecoration: "none", marginTop: 8 }}>
          {strings.applyButton}
        </a>
      </div>

      <div style={{ textAlign: "center", marginTop: 8 }}>
        <button type="button" className="bb-btn bb-btn-secondary" onClick={handleDownload} disabled={downloading}>
          {downloading ? "…" : strings.downloadPdf}
        </button>
        {downloadError && (
          <div style={{ color: "var(--bb-danger)", marginTop: 8, fontSize: "0.9rem" }}>{downloadError}</div>
        )}
      </div>

      <div className="bb-disclaimer">{strings.disclaimer}</div>
    </div>
  );
}
