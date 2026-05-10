"""BenefitBridge FastAPI app."""
import os
import logging
from concurrent.futures import ThreadPoolExecutor
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel

# Load .env from project root or backend dir.
load_dotenv()
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

import eligibility
import gemini
import sms
import forms
from translate import translate, translate_documents

logging.basicConfig(level=logging.INFO)

app = FastAPI(title="BenefitBridge API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


DISCLAIMER_EN = (
    "BenefitBridge is a screening tool, not a benefits determination. "
    "Eligibility is confirmed through the official application process."
)
DISCLAIMER_ES = translate(DISCLAIMER_EN, "es")


class IntakeProfile(BaseModel):
    full_name: str = ""
    date_of_birth: str = ""
    address: str = ""
    city: str = ""
    zip_code: str = ""
    phone: str = ""
    monthly_income: float = 0
    household_size: int = 1
    age: int = 0
    recently_unemployed: bool = False
    worked_last_18_months: bool = False
    self_employed: bool = False
    citizen_or_legal_resident: bool = False
    has_disability: bool = False
    pregnant: bool = False
    has_children_under_5: bool = False
    is_student: bool = False
    work_study: bool = False
    cal_grant_a_or_b: bool = False
    campus_support_program: bool = False
    works_20_hours_week: bool = False
    has_dependent_under_12: bool = False
    meal_plan_count: int = 0
    ssn_last4: str = ""
    last_employer: str = ""
    separation_date: str = ""
    language: str = "en"


class ReminderRequest(BaseModel):
    phone: str
    program_name: str
    renewal_date: str
    language: str = "en"


class FormPdfRequest(BaseModel):
    profile: IntakeProfile
    program_name: str


class SupportScriptRequest(BaseModel):
    profile: IntakeProfile
    program_names: list[str] = []
    language: str = "en"


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/intake")
def intake(profile: IntakeProfile):
    p = profile.model_dump()
    language = p.get("language", "en") or "en"

    matches = eligibility.evaluate(p)

    # Localize document strings.
    for m in matches:
        m["documents_needed"] = translate_documents(m["documents_needed"], language)

    # Generate explanations in parallel — only for the user's language.
    # 4 programs * 8s/each sequential is too slow for an intake request.
    with ThreadPoolExecutor(max_workers=max(1, len(matches))) as ex:
        futures = {
            m["name"]: ex.submit(
                gemini.generate_explanation,
                m["name"], m["description"], p, language,
            )
            for m in matches
        }
        for m in matches:
            text = futures[m["name"]].result()
            if language == "es":
                m["plain_language_explanation"] = ""
                m["plain_language_explanation_es"] = text
            else:
                m["plain_language_explanation"] = text
                m["plain_language_explanation_es"] = ""

    # Master deduplicated checklist
    docs_by_program = {m["name"]: m["documents_needed"] for m in matches}
    master_checklist = gemini.synthesize_document_checklist(
        [m["name"] for m in matches], docs_by_program, language,
    )

    return {
        "profile": p,
        "matched_programs": matches,
        "total_monthly_estimate": eligibility.total_monthly_estimate(matches),
        "master_document_checklist": master_checklist,
        "disclaimer": DISCLAIMER_ES if language == "es" else DISCLAIMER_EN,
    }


@app.post("/api/sms-reminder")
def sms_reminder(req: ReminderRequest):
    result = sms.schedule_reminder(
        req.phone, req.program_name, req.renewal_date, req.language,
    )
    return result


@app.post("/api/form-pdf")
def form_pdf(req: FormPdfRequest):
    """Generate a single-program PDF summary on demand."""
    p = req.profile.model_dump()
    matches = eligibility.evaluate(p)
    target = next((m for m in matches if m["name"] == req.program_name), None)
    if not target:
        raise HTTPException(status_code=404, detail="Program not matched for this profile")
    pdf_bytes = forms.generate_form_summary_pdf(target, p)
    safe_name = req.program_name.replace(" ", "_")
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=BenefitBridge_{safe_name}.pdf"},
    )


@app.post("/api/support-script")
def support_script(req: SupportScriptRequest):
    p = req.profile.model_dump()
    lang = req.language or p.get("language", "en") or "en"
    # Use Gemini for a short handover script; fallback is handled inside gemini.py.
    script = gemini.generate_support_script(req.program_names, p, lang)
    return {"script": script}


@app.get("/api/intake-question/{question_key}")
def intake_question(question_key: str, language: str = "en"):
    return {"text": gemini.generate_intake_question(question_key, language)}
