"""All Gemini API calls.

Wraps every call in try/except with a fallback string. Never crash the intake flow
because of a network or quota issue.
"""
import os
import json
import logging
from typing import Dict, Any, List

import httpx

logger = logging.getLogger("benefitbridge.gemini")

GEMINI_MODEL = "gemini-2.5-flash"
GEMINI_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    f"{GEMINI_MODEL}:generateContent"
)

SYSTEM_INSTRUCTION = (
    "You are a compassionate benefits counselor helping low-income California "
    "residents understand government assistance programs. Explain benefits in "
    "warm, plain language at a 6th grade reading level. Never use bureaucratic "
    "jargon. Be specific about dollar amounts and what the program actually "
    "covers. Always respond only with the explanation text, no preamble, no "
    "lists. If language is 'es', respond entirely in Spanish."
)


# Cache for intake question phrasings — Gemini shouldn't be called twice for the
# same question/language pair.
_QUESTION_CACHE: Dict[str, str] = {}


def _gemini_call(prompt: str, timeout: float = 15.0) -> str:
    """Single Gemini call. Raises on any failure — caller decides what to do."""
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY not set")

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.4,
            "maxOutputTokens": 400,
            # Gemini 2.5 charges thinking tokens against the output budget.
            # Disable thinking — these are short, plain-language paragraphs.
            "thinkingConfig": {"thinkingBudget": 0},
        },
    }
    with httpx.Client(timeout=timeout) as client:
        resp = client.post(
            f"{GEMINI_URL}?key={api_key}",
            headers={"Content-Type": "application/json"},
            content=json.dumps(payload),
        )
        resp.raise_for_status()
        data = resp.json()
    candidates = data.get("candidates") or []
    if not candidates:
        raise RuntimeError("Gemini returned no candidates")
    parts = candidates[0].get("content", {}).get("parts") or []
    text = "".join(p.get("text", "") for p in parts).strip()
    if not text:
        raise RuntimeError("Gemini returned empty text")
    return text


# ---------------------------------------------------------------------------
# Static fallbacks — used when Gemini is unavailable.
# ---------------------------------------------------------------------------

_FALLBACK_EXPLANATIONS = {
    ("CalFresh", "en"): "CalFresh helps you buy groceries by adding money to a card you can use at the store. Based on your income, you could receive around $291 each month for food.",
    ("CalFresh", "es"): "CalFresh te ayuda a comprar comestibles agregando dinero a una tarjeta que puedes usar en la tienda. Según tus ingresos, podrías recibir alrededor de $291 al mes para comida.",
    ("Medi-Cal", "en"): "Medi-Cal gives you free or very low-cost health insurance. That includes doctor visits, prescriptions, and hospital care — usually with no monthly bill.",
    ("Medi-Cal", "es"): "Medi-Cal te ofrece seguro médico gratuito o de muy bajo costo. Incluye visitas al médico, recetas y atención hospitalaria, normalmente sin pagos mensuales.",
    ("Unemployment Insurance", "en"): "Unemployment Insurance pays you weekly while you look for a new job. Based on your recent work history, you could receive around 60-70% of your old paycheck, up to about $450 per week.",
    ("Unemployment Insurance", "es"): "El Seguro de Desempleo te paga semanalmente mientras buscas un nuevo trabajo. Según tu historial laboral reciente, podrías recibir alrededor del 60-70% de tu salario anterior, hasta unos $450 por semana.",
    ("General Relief", "en"): "General Relief is county cash help for adults with very little or no income. It usually pays $221 to $337 per month while you get back on your feet.",
    ("General Relief", "es"): "Asistencia General es ayuda en efectivo del condado para adultos con muy pocos o ningún ingreso. Generalmente paga entre $221 y $337 al mes mientras te recuperas.",
    ("WIC", "en"): "WIC gives food benefits and nutrition support if you're pregnant or have a child under 5. You'll get a card to buy healthy foods like milk, cereal, fruits and vegetables.",
    ("WIC", "es"): "WIC ofrece beneficios de alimentos y apoyo nutricional si estás embarazada o tienes un hijo menor de 5 años. Recibirás una tarjeta para comprar alimentos saludables como leche, cereales, frutas y verduras.",
}


_INTAKE_QUESTIONS = {
    ("monthly_income", "en"): "What is your total household income each month? Include wages, child support, or any other money coming in. If you have no income right now, say 0.",
    ("monthly_income", "es"): "¿Cuál es el ingreso total mensual de tu hogar? Incluye salarios, manutención de hijos o cualquier otro dinero que entre. Si no tienes ingresos ahora, di 0.",
    ("household_size", "en"): "How many people live in your home and share expenses with you? Count yourself.",
    ("household_size", "es"): "¿Cuántas personas viven en tu hogar y comparten gastos contigo? Cuéntate a ti.",
    ("recently_unemployed", "en"): "Have you lost a job or been laid off in the last 18 months?",
    ("recently_unemployed", "es"): "¿Has perdido un trabajo o te han despedido en los últimos 18 meses?",
    ("worked_last_18_months", "en"): "Have you worked at any job in the last 18 months?",
    ("worked_last_18_months", "es"): "¿Has trabajado en algún empleo en los últimos 18 meses?",
    ("self_employed", "en"): "Are you currently self-employed or working as a contractor?",
    ("self_employed", "es"): "¿Trabajas actualmente por cuenta propia o como contratista?",
    ("has_disability", "en"): "Do you have a disability that limits your ability to work?",
    ("has_disability", "es"): "¿Tienes una discapacidad que limita tu capacidad para trabajar?",
    ("pregnant", "en"): "Are you currently pregnant?",
    ("pregnant", "es"): "¿Estás embarazada actualmente?",
    ("has_children_under_5", "en"): "Do you have any children under the age of 5 living with you?",
    ("has_children_under_5", "es"): "¿Tienes hijos menores de 5 años viviendo contigo?",
    ("citizen_or_legal_resident", "en"): "Are you a U.S. citizen or legal permanent resident? This is used only to match you with the right programs and is never stored.",
    ("citizen_or_legal_resident", "es"): "¿Eres ciudadano de EE. UU. o residente permanente legal? Esto se usa solo para emparejarte con los programas correctos y no se almacena.",
}


def _first_name(full_name: str) -> str:
    return (full_name or "there").strip().split(" ")[0]


def generate_explanation(
    program_name: str,
    program_description: str,
    profile: Dict[str, Any],
    language: str = "en",
) -> str:
    """Plain-language, 2-3 sentence explanation tailored to the user."""
    fallback = _FALLBACK_EXPLANATIONS.get(
        (program_name, language),
        program_description,
    )

    first_name = _first_name(profile.get("full_name", ""))
    age = profile.get("age", "")
    city = profile.get("city", "California")
    income = profile.get("monthly_income", 0)

    user_prompt = (
        f"{SYSTEM_INSTRUCTION}\n\n"
        f"Explain the {program_name} program to {first_name}, who is {age} years "
        f"old, lives in {city} California, and has a monthly income of ${income}. "
        f"Keep it to 2-3 sentences. Tell them specifically what this program will "
        f"give them and approximately how much. Language: {language}"
    )
    try:
        return _gemini_call(user_prompt)
    except Exception as e:
        logger.warning("Gemini explanation failed for %s: %s", program_name, e)
        return fallback


def generate_intake_question(question_key: str, language: str = "en") -> str:
    """Plain-language version of an intake question. Cached."""
    cache_key = f"{question_key}:{language}"
    if cache_key in _QUESTION_CACHE:
        return _QUESTION_CACHE[cache_key]

    fallback = _INTAKE_QUESTIONS.get(
        (question_key, language),
        _INTAKE_QUESTIONS.get((question_key, "en"), question_key),
    )
    # Hackathon shortcut: the hardcoded versions are already 6th-grade clear
    # and consistent across runs. Skip the live call to keep intake snappy.
    _QUESTION_CACHE[cache_key] = fallback
    return fallback


def synthesize_document_checklist(
    program_names: List[str],
    documents_by_program: Dict[str, List[str]],
    language: str = "en",
) -> List[str]:
    """Deduplicated master checklist across all matched programs."""
    from translate import translate
    seen = set()
    result: List[str] = []
    for name in program_names:
        for doc in documents_by_program.get(name, []):
            translated = translate(doc, language)
            key = translated.lower()
            if key in seen:
                continue
            seen.add(key)
            result.append(translated)
    return result


def generate_support_script(
    program_names: List[str],
    profile: Dict[str, Any],
    language: str = "en",
) -> str:
    """
    3-sentence handover script the user can read verbatim to a local specialist.
    """
    first_name = _first_name(profile.get("full_name", ""))
    city = profile.get("city", "California")
    student = bool(profile.get("is_student", False))
    items = ", ".join(program_names[:4]) if program_names else "a few programs"

    fallback_en = (
        f"Hi, I'm using BenefitBridge. I live in {city}, California. "
        f"It looks like I may qualify for {items}. Can you help me finalize my next steps?"
    )
    fallback_es = (
        f"Hola, estoy usando BenefitBridge. Vivo en {city}, California. "
        f"Parece que podría calificar para {items}. ¿Me puedes ayudar con los siguientes pasos?"
    )
    fallback = fallback_es if language == "es" else fallback_en

    user_prompt = (
        "Write a short call script the user can read to a local benefits specialist.\n"
        "Constraints:\n"
        "- Exactly 3 sentences.\n"
        "- Plain language, professional tone.\n"
        "- Mention their city and that they are using BenefitBridge.\n"
        "- If they are a student, include that.\n"
        "- Mention 2-3 of the matched items by name.\n"
        "- End with a direct request for help finishing the application/next steps.\n"
        f"User first name: {first_name}\n"
        f"City: {city}\n"
        f"Student: {student}\n"
        f"Matched: {items}\n"
        f"Language: {language}\n"
    )
    try:
        return _gemini_call(user_prompt)
    except Exception as e:
        logger.warning("Gemini support script failed: %s", e)
        return fallback
