# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

BenefitBridge is a hackathon web app that helps low-income California residents discover government benefits they qualify for. The user answers ~8 plain-English questions; the app returns matched programs (CalFresh, Medi-Cal, EDD, General Relief, WIC) with **prefilled application fields** and **plain-language Gemini-generated explanations** in English or Spanish.

The headline demo moment: one intake → multiple programs that all share the same prefilled name/address/phone/etc. simultaneously. Treat that as a load-bearing feature when refactoring.

## Commands

Backend (FastAPI, Python 3):

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate   # first time only
pip install -r requirements.txt                      # first time only
uvicorn main:app --reload --port 8001                # run dev server
```

Frontend (Vite + React + TS):

```bash
cd frontend
npm install                                          # first time only
npm run dev                                          # dev server (auto-picks free port)
npm run build                                        # tsc + vite build
```

There are no tests, no linter, and no test runner configured. Don't claim a change is verified by "running tests" — verify by curling `/api/intake` with the Rosa demo payload and checking the four-program HIGH-confidence response.

End-to-end smoke test (with backend on 8001):

```bash
curl -s -X POST http://localhost:8001/api/intake -H "Content-Type: application/json" -d '{
  "full_name":"Rosa Martinez","date_of_birth":"1966-03-15","city":"Woodland","zip_code":"95695",
  "phone":"+15304441234","age":58,"monthly_income":0,"household_size":1,
  "recently_unemployed":true,"worked_last_18_months":true,"citizen_or_legal_resident":true,
  "language":"en"
}' | python3 -m json.tool | head -40
```

## Port conventions

- **Backend: 8001** (NOT 8000 — that port is occupied by an unrelated drone/VLM service on this machine).
- **Frontend: 5173** (or whatever Vite picks if 5173 is taken; check the Vite startup log).
- The frontend reads `VITE_API_URL` from `frontend/.env`. That file currently points to `http://localhost:8001` — keep it in sync if you change the backend port.

## Environment variables

Project-root `.env` (loaded by `backend/main.py` via `python-dotenv`):

- `GEMINI_API_KEY` — required for live tailored explanations. Without it, the app silently uses hardcoded fallback explanations from `gemini.py` (`_FALLBACK_EXPLANATIONS`). Both paths are valid; nothing crashes.
- `TWILIO_SID` / `TWILIO_AUTH` / `TWILIO_FROM` — optional. Without them, the SMS endpoint returns `{"success": false, "message": "SMS not configured"}` rather than 500ing.

**Never crash on missing optional env vars.** This is enforced throughout `gemini.py`, `sms.py`, and `main.py` and is a hard product requirement — the app must run end-to-end with only `GEMINI_API_KEY` set, or even with nothing set.

## Architecture

### Backend layout (`backend/`)

- `main.py` — FastAPI routes (`/api/intake`, `/api/sms-reminder`, `/api/form-pdf`, `/api/health`, `/api/intake-question/{key}`). Wires the modules together.
- `eligibility.py` — **pure-Python rules engine.** No ML. Each program in `PROGRAMS` is a dict with a `check(profile) -> bool` and a `prefill(profile) -> dict[str, str]`. `evaluate(profile)` is the single entry point.
- `gemini.py` — all Gemini API calls. Currently `gemini-2.5-flash` with `thinkingConfig.thinkingBudget = 0` (Gemini 2.5 charges thinking tokens against the output budget; without this, responses get truncated mid-sentence). Every call is wrapped in try/except with a fallback string.
- `forms.py` — reportlab-based PDF summary generation. We do NOT fill official government PDFs (they're scanned/inconsistent); we generate a clean printable summary the user brings to an appointment.
- `sms.py` — Twilio wrapper; lazy import so the SDK isn't a hard dep at module load.
- `translate.py` — hardcoded EN→ES dict for static UI strings (document names, agency labels, disclaimer). Dynamic per-user explanations come from Gemini, not from here.

### Why the rules engine looks dumb but is correct

The pitch frames the app as ML-powered. The "ML" is Gemini generating tailored plain-language explanations — NOT eligibility scoring. **Eligibility is a hand-written rules engine on purpose**, because government benefit eligibility is a deterministic legal calculation with published income limits, and an ML classifier would be both wrong and dangerous here. Don't "improve" `eligibility.py` by replacing the rules with a model.

### `SHARED_FIELDS` and the demo moment

`eligibility.SHARED_FIELDS` lists the fields that flow into multiple programs' prefills (name, DOB, address, city, ZIP, phone). Every program's `prefill()` pulls from these same keys in the profile dict — that's why one intake produces consistent prefilled fields across CalFresh + Medi-Cal + EDD simultaneously. If you change a shared field name in one program's prefill, change it everywhere or the demo moment breaks.

### Confidence scoring

`_confidence_for(program_name, profile)` returns "high" / "medium" / "low". It's separate from the boolean `check()` so we can pass eligibility but flag edge cases (e.g., income near the limit). The frontend color-codes these (green/amber/grey pills). `total_monthly_estimate()` deliberately excludes `low` confidence matches — don't change that without thinking through the trust implications.

### Parallel Gemini calls

`/api/intake` runs all per-program Gemini calls in parallel via `ThreadPoolExecutor` (in `main.py`). A 4-program intake with sequential calls took ~16s; parallel brings it under 4s. Only the **selected language** is generated per program (not both EN and ES) — the unselected field is left empty. The frontend's render logic accommodates either field being filled.

### Frontend layout (`frontend/src/`)

- `App.tsx` — three-screen state machine (`intake` / `results` / `formview`) and the `STRINGS` object containing all UI copy in EN and ES. There's no router — just `useState` on `screen`.
- `screens/Intake.tsx` — 8-question wizard. Defines the `DEMO` Rosa profile inline; the "Load Demo Profile" button is essential for the live demo.
- `screens/Results.tsx` — the hero screen. Animated count-up, sequenced ProgramCard reveals, master deduplicated document checklist, "Pre-fill" modal that collects the extra fields not asked during intake (street address, SSN last 4, etc.).
- `screens/FormView.tsx` — single-program prefilled view; highlighted prefill table is the "this was filled in for you" UX moment.
- `components/VoiceInput.tsx` — Web Speech API wrapper. **Renders `null` if `window.SpeechRecognition` is unavailable** — never throw or show a broken mic button on unsupported browsers (Firefox).
- `api.ts` — `fetch` wrappers; reads `VITE_API_URL`.

### Styling

Styles live in `frontend/index.html` inside a `<style>` block as CSS variables + utility-ish classes prefixed `bb-`. There is no Tailwind, no CSS modules, no styled-components. Stick to the existing CSS variables (`--bb-green`, `--bb-amber-soft`, etc.) — the warm cream + forest-green palette is part of the product spec (deliberately NOT cold government blue or startup purple gradient).

## Things to leave alone

- **The hardcoded fallback explanations in `gemini.py`** are a feature, not tech debt. They make the app demo-able offline and survive Gemini outages. Do not delete them in favor of "just calling Gemini reliably".
- **The disclaimer text** appears on Results + FormView intentionally. It's the legal answer to "is this benefits advice?" and must remain visible in both EN and ES.
- **`citizen_or_legal_resident`** is processed in-memory only and never persisted. The intake question UI explicitly says so. Don't add logging, analytics, or storage that captures it.

## Known gotchas

- The intake spec said "expected 3 matches for Rosa." The rules as written produce **4** (CalFresh, Medi-Cal, Unemployment Insurance, **General Relief** — she meets the GR criteria of age 18-65, income < $400, citizen). 4 is correct; the spec was off by one.
- The frontend `tsconfig.json` includes `"types": ["vite/client"]` — needed so `import.meta.env` typechecks. Without it `tsc --noEmit` errors on `api.ts`.
- `gemini-1.5-flash` is retired; use `gemini-2.5-flash` (set in `gemini.py`).
