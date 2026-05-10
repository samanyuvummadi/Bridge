"""Static UI string translations for Bridge.

Dynamic per-user explanations come from gemini.py. This file handles the
predictable static strings — labels, document names, agency descriptions —
where a hardcoded dict beats a flaky live translation API during a demo.
"""
from typing import Dict


TRANSLATIONS: Dict[str, str] = {
    # Document strings
    "Photo ID": "Identificación con foto",
    "Proof of address": "Comprobante de domicilio",
    "Proof of CA residency": "Comprobante de residencia en California",
    "Proof of income last 30 days": "Comprobante de ingresos de los últimos 30 días",
    "Proof of income": "Comprobante de ingresos",
    "Proof of no/low income": "Comprobante de ingresos bajos o nulos",
    "SSNs for all household members": "Números de Seguro Social de todos los miembros del hogar",
    "SSN if available": "Número de Seguro Social si está disponible",
    "SSN": "Número de Seguro Social",
    "Bank statements last 30 days": "Estados de cuenta bancarios de los últimos 30 días",
    "Immigration documents if applicable": "Documentos de inmigración si aplica",
    "Last employer name, address, and phone": "Nombre, dirección y teléfono del último empleador",
    "Employment dates": "Fechas de empleo",
    "Reason for separation": "Razón de la separación",
    "Wage info last 18 months": "Información salarial de los últimos 18 meses",
    "CA residency proof": "Comprobante de residencia en California",
    "Proof of identity": "Comprobante de identidad",
    "Proof of pregnancy or child's age": "Comprobante de embarazo o edad del niño",

    # Confidence levels
    "high": "alta",
    "medium": "media",
    "low": "baja",

    # Common phrases
    "Bridge is a screening tool, not a benefits determination. Eligibility is confirmed through the official application process.":
        "Bridge es una herramienta de evaluación, no una determinación oficial de beneficios. Su elegibilidad se confirma al completar la solicitud oficial.",
}


def translate(key: str, language: str = "en") -> str:
    """Return Spanish translation if language='es', else return the key itself."""
    if language == "es" and key in TRANSLATIONS:
        return TRANSLATIONS[key]
    return key


def translate_documents(documents, language: str = "en"):
    """Translate a list of document strings."""
    return [translate(d, language) for d in documents]
