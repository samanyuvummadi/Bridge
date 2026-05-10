# BenefitBridge

**BenefitBridge** helps low-income California residents discover government benefits they qualify for — fast. Answer ~8 plain-English questions and get matched programs with prefilled application fields and Gemini-generated plain-language explanations in English or Spanish.

**The headline feature:** one intake → multiple programs (CalFresh, Medi-Cal, EDD, General Relief, WIC) all receive the same prefilled name, address, phone, and personal details simultaneously.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI · Python 3 |
| Frontend | Vite · React · TypeScript |
| AI | Google Gemini 2.5 Flash |
| PDF | ReportLab |
| SMS (optional) | Twilio |

---

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+

### 1. Clone & configure environment

```bash
git clone <repo-url>
cd BenefitBridge
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY (see Environment Variables below)
```

### 2. Backend

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate   # first time only
pip install -r requirements.txt                      # first time only
uvicorn main:app --reload --port 8001
```

### 3. Frontend

```bash
cd frontend
npm install        # first time only
npm run dev        # dev server — check Vite output for the port (default 5173)
```

The frontend reads `VITE_API_URL` from `frontend/.env`, which should point to `http://localhost:8001`.

---

## Environment Variables

Project-root `.env` is loaded by the backend via `python-dotenv`.

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | Recommended | Live Gemini explanations. Without it, hardcoded fallback text is used — the app still runs fully offline. |
| `TWILIO_SID` | Optional | Twilio Account SID for SMS reminders. |
| `TWILIO_AUTH` | Optional | Twilio Auth Token. |
| `TWILIO_FROM` | Optional | Twilio sender phone number. |

The app **never crashes on missing optional vars** — SMS silently returns `{"success": false}` and Gemini falls back to static explanations.

---

## Port Conventions

- **Backend: 8001** (port 8000 is reserved by an unrelated local service)
- **Frontend: 5173** (or whatever Vite picks; check the Vite startup log)

---

## Architecture

### Backend (`backend/`)

| File | Role |
|---|---|
| `main.py` | FastAPI routes: `/api/intake`, `/api/sms-reminder`, `/api/form-pdf`, `/api/health`, `/api/intake-question/{key}` |
| `eligibility.py` | Pure-Python deterministic rules engine. Each program has a `check(profile) -> bool` and `prefill(profile) -> dict`. Eligibility is **not** ML — it's a hand-written legal calculation with published income limits. |
| `gemini.py` | All Gemini API calls (`gemini-2.5-flash`). Parallel execution via `ThreadPoolExecutor`. Every call has a try/except with a fallback string. |
| `forms.py` | ReportLab PDF summary generation (a clean printable summary, not filled official PDFs). |
| `sms.py` | Twilio wrapper with lazy import — the SDK is not a hard dependency at module load. |
| `translate.py` | Hardcoded EN→ES dictionary for static UI strings. Dynamic explanations come from Gemini. |

**`SHARED_FIELDS`** in `eligibility.py` lists the fields that flow into every program's `prefill()` — name, DOB, address, city, ZIP, phone. This is what makes the simultaneous prefill moment work.

### Frontend (`frontend/src/`)

| File | Role |
|---|---|
| `App.tsx` | Three-screen state machine: `intake` → `results` → `formview`. No router. |
| `screens/Intake.tsx` | 8-question wizard. Includes the "Load Demo Profile" button (Rosa Martinez). |
| `screens/Results.tsx` | Hero screen — animated count-up, sequenced program card reveals, deduplicated document checklist, pre-fill modal. |
| `screens/FormView.tsx` | Single-program prefilled view with highlighted prefill table. |
| `components/VoiceInput.tsx` | Web Speech API wrapper. Renders `null` on unsupported browsers (e.g. Firefox) — never throws. |
| `api.ts` | `fetch` wrappers; reads `VITE_API_URL`. |

Styles live in `frontend/index.html` as a `<style>` block using CSS variables (`--bb-green`, `--bb-amber-soft`, etc.). No Tailwind, no CSS modules.

---

## Supported Programs

| Program | Agency |
|---|---|
| CalFresh (SNAP) | California DHSS |
| Medi-Cal (Medicaid) | California DHCS |
| Unemployment Insurance (EDD) | California EDD |
| General Relief | County |
| WIC | California WIC |

---

## Smoke Test

With the backend running on port 8001:

```bash
curl -s -X POST http://localhost:8001/api/intake \
  -H "Content-Type: application/json" \
  -d '{
    "full_name":"Rosa Martinez","date_of_birth":"1966-03-15","city":"Woodland","zip_code":"95695",
    "phone":"+15304441234","age":58,"monthly_income":0,"household_size":1,
    "recently_unemployed":true,"worked_last_18_months":true,"citizen_or_legal_resident":true,
    "language":"en"
  }' | python3 -m json.tool | head -40
```

Expected: 4 programs matched at HIGH confidence (CalFresh, Medi-Cal, Unemployment Insurance, General Relief).

---

## Build

```bash
cd frontend
npm run build   # tsc + vite build → frontend/dist/
```
