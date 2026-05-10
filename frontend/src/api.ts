// Default to same-origin so the dev server can proxy `/api` for LAN/mobile testing.
// If an env URL points at localhost, ignore it when running on a non-localhost device
// (e.g. iPhone on hotspot), since that would target the phone itself.
const ENV_BASE = (import.meta.env.VITE_API_URL as string | undefined) || "";
const isBrowser = typeof window !== "undefined";
const isLocalHost =
  isBrowser && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
const envLooksLikeLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(ENV_BASE);

const BASE = !isLocalHost && envLooksLikeLocalhost ? "" : ENV_BASE;

export type Language = "en" | "es";

export interface IntakeProfile {
  full_name: string;
  date_of_birth: string;
  address: string;
  city: string;
  zip_code: string;
  phone: string;
  monthly_income: number;
  household_size: number;
  age: number;
  recently_unemployed: boolean;
  worked_last_18_months: boolean;
  self_employed: boolean;
  citizen_or_legal_resident: boolean;
  has_disability: boolean;
  pregnant: boolean;
  has_children_under_5: boolean;
  is_student: boolean;
  work_study: boolean;
  cal_grant_a_or_b: boolean;
  campus_support_program: boolean;
  works_20_hours_week: boolean;
  has_dependent_under_12: boolean;
  meal_plan_count: number;
  ssn_last4: string;
  last_employer: string;
  separation_date: string;
  language: Language;
}

export interface MatchedProgram {
  name: string;
  description: string;
  confidence: "high" | "medium" | "low";
  monthly_value_estimate: string;
  monthly_value_low: number;
  form: string;
  agency: string;
  apply_url: string;
  renewal_date: string;
  documents_needed: string[];
  prefilled_fields: Record<string, string>;
  plain_language_explanation: string;
  plain_language_explanation_es: string;
}

export interface IntakeResponse {
  profile: IntakeProfile;
  matched_programs: MatchedProgram[];
  total_monthly_estimate: string;
  master_document_checklist: string[];
  disclaimer: string;
}

export interface ReminderResponse {
  success: boolean;
  message: string;
}

async function jsonOrThrow<T>(resp: Response): Promise<T> {
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(text || `Request failed with status ${resp.status}`);
  }
  return resp.json() as Promise<T>;
}

export async function submitIntake(profile: IntakeProfile): Promise<IntakeResponse> {
  const resp = await fetch(`${BASE}/api/intake`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profile),
  });
  return jsonOrThrow<IntakeResponse>(resp);
}

export async function setSmsReminder(
  phone: string,
  programName: string,
  renewalDate: string,
  language: Language
): Promise<ReminderResponse> {
  const resp = await fetch(`${BASE}/api/sms-reminder`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      phone,
      program_name: programName,
      renewal_date: renewalDate,
      language,
    }),
  });
  return jsonOrThrow<ReminderResponse>(resp);
}

export async function downloadFormPdf(
  programName: string,
  profile: IntakeProfile
): Promise<Blob> {
  const resp = await fetch(`${BASE}/api/form-pdf`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profile, program_name: programName }),
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(text || `PDF request failed with status ${resp.status}`);
  }
  return resp.blob();
}

export async function checkHealth(): Promise<boolean> {
  try {
    const resp = await fetch(`${BASE}/api/health`);
    return resp.ok;
  } catch {
    return false;
  }
}

export interface SupportScriptResponse {
  script: string;
}

export async function getSupportScript(
  profile: IntakeProfile,
  programNames: string[],
  language: Language
): Promise<string> {
  const resp = await fetch(`${BASE}/api/support-script`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profile, program_names: programNames, language }),
  });
  const data = await jsonOrThrow<SupportScriptResponse>(resp);
  return data.script;
}
