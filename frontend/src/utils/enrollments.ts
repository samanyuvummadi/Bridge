export interface Enrollment {
  program_name: string;
  enrolled_date: string; // ISO date string (YYYY-MM-DD)
  renewal_date: string; // ISO date string (YYYY-MM-DD)
  monthly_value: number; // numeric dollars
  reminder_set: boolean;
  phone: string;
  language: "en" | "es";
  status: "active" | "expired";
  /** Optional per-enrollment checklist (e.g. Rosa demo CalFresh renewal docs). */
  renewal_docs?: string[];
}

const STORAGE_KEY = "benefitbridge_enrollments";

function safeParseJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function toDateMidnight(isoDate: string): Date {
  // Treat date-only strings as local midnight to keep UI stable.
  return new Date(`${isoDate}T00:00:00`);
}

function todayIso(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/** Local calendar date as YYYY-MM-DD, offset from today at local midnight. */
function isoDatePlusDaysFromToday(deltaDays: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + deltaDays);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function diffDays(a: Date, b: Date): number {
  const ms = b.getTime() - a.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function writeEnrollments(enrollments: Enrollment[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(enrollments));
}

export function getEnrollments(): Enrollment[] {
  const parsed = safeParseJson<unknown>(localStorage.getItem(STORAGE_KEY));
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(Boolean) as Enrollment[];
}

export function addEnrollment(enrollment: Enrollment): void {
  const current = getEnrollments();
  const next = [
    enrollment,
    ...current.filter((e) => e?.program_name !== enrollment.program_name),
  ];
  writeEnrollments(next);
}

export function updateEnrollment(programName: string, updates: Partial<Enrollment>): void {
  const current = getEnrollments();
  const next = current.map((e) => (e.program_name === programName ? { ...e, ...updates } : e));
  writeEnrollments(next);
}

export function clearEnrollments(): void {
  localStorage.removeItem(STORAGE_KEY);
}

// Calculate days until renewal (negative = overdue)
export function daysUntilRenewal(renewalDate: string): number {
  const today = toDateMidnight(todayIso());
  const renewal = toDateMidnight(renewalDate);
  return diffDays(today, renewal);
}

// Calculate months since enrollment (floored)
export function monthsSinceEnrollment(enrolledDate: string): number {
  const start = toDateMidnight(enrolledDate);
  const end = toDateMidnight(todayIso());
  const days = Math.max(0, diffDays(start, end));
  return Math.floor(days / 30);
}

function monthsBetweenCapped(enrolledDate: string, renewalDate: string): number {
  const start = toDateMidnight(enrolledDate);
  const cap = toDateMidnight(renewalDate);
  const end = toDateMidnight(todayIso());
  const effectiveEnd = end.getTime() > cap.getTime() ? cap : end;
  const days = Math.max(0, diffDays(start, effectiveEnd));
  return Math.floor(days / 30);
}

/** Benefits accumulated through today, capped at renewal (same math as hero total). */
export function accumulatedValueForEnrollment(e: Enrollment): number {
  return e.monthly_value * monthsBetweenCapped(e.enrolled_date, e.renewal_date);
}

// Calculate total saved across all enrollments
export function calculateTotalSaved(enrollments: Enrollment[]): number {
  return enrollments.reduce((sum, e) => sum + accumulatedValueForEnrollment(e), 0);
}

// Get urgency level for a program
export function getUrgency(daysRemaining: number): "safe" | "soon" | "urgent" | "critical" | "expired" {
  if (daysRemaining < 0) return "expired";
  if (daysRemaining < 7) return "critical";
  if (daysRemaining < 30) return "urgent";
  if (daysRemaining <= 60) return "soon";
  return "safe";
}

/**
 * Demo Mode — Rosa Martinez: clears storage and injects three programs with renewal
 * dates relative to today (urgent CalFresh, action-needed Medi-Cal, expired UI).
 */
export function loadRosaDemoData(): void {
  clearEnrollments();
  const phone = "+15304441234";
  const list: Enrollment[] = [
    {
      program_name: "CalFresh",
      enrolled_date: "2025-01-15",
      renewal_date: isoDatePlusDaysFromToday(2),
      monthly_value: 291,
      reminder_set: false,
      phone,
      language: "en",
      status: "active",
      renewal_docs: ["Government-issued photo ID", "Proof of income (last 30 days)", "Utility bill (proof of address)"],
    },
    {
      program_name: "Medi-Cal",
      enrolled_date: "2025-01-15",
      renewal_date: isoDatePlusDaysFromToday(15),
      monthly_value: 200,
      reminder_set: false,
      phone,
      language: "en",
      status: "active",
    },
    {
      program_name: "Unemployment Insurance",
      enrolled_date: "2025-01-01",
      renewal_date: isoDatePlusDaysFromToday(-30),
      monthly_value: 1800,
      reminder_set: false,
      phone,
      language: "en",
      status: "expired",
    },
  ];
  writeEnrollments(list);
}

/** @deprecated Prefer loadRosaDemoData(); kept for compatibility. */
export function loadDemoEnrollments(): void {
  loadRosaDemoData();
}

export function getMonthsTracked(enrollments: Enrollment[]): number {
  if (enrollments.length === 0) return 0;
  return Math.max(...enrollments.map((e) => monthsBetweenCapped(e.enrolled_date, e.renewal_date)));
}

