"""BenefitBridge eligibility rules engine.

Pure Python rules — no ML. Each program is a dict with a `check` and a `prefill`.
The shared-fields list at the bottom is the demo moment: same data, multiple forms.
"""
from datetime import datetime, timedelta
from typing import Callable, Dict, List, Any


# Fields shared across every program's prefill.
# Mentioning this explicitly because the deduplicated cross-form prefill
# is the product's headline demo moment.
SHARED_FIELDS = [
    "full_name",
    "date_of_birth",
    "address",
    "city",
    "zip_code",
    "phone",
]


# Income limits used by CalFresh and WIC (gross monthly, by household size).
CALFRESH_INCOME_LIMITS = {1: 2248, 2: 3041, 3: 3834, 4: 4626, 5: 5419}
MEDICAL_INCOME_LIMITS = {1: 1732, 2: 2343, 3: 2953, 4: 3564, 5: 4174}


def _income_limit(table: Dict[int, int], household_size: int) -> int:
    if household_size <= 0:
        household_size = 1
    if household_size in table:
        return table[household_size]
    # extrapolate beyond the table using the largest tier
    largest = max(table.keys())
    per_extra = table[largest] - table[largest - 1] if largest > 1 else table[largest]
    return table[largest] + per_extra * (household_size - largest)


def _fmt_date(iso: str) -> str:
    """Convert ISO yyyy-mm-dd to mm/dd/yyyy for display."""
    if not iso:
        return ""
    try:
        return datetime.strptime(iso, "%Y-%m-%d").strftime("%m/%d/%Y")
    except ValueError:
        return iso


def _fmt_phone(phone: str) -> str:
    digits = "".join(ch for ch in (phone or "") if ch.isdigit())
    if len(digits) == 11 and digits.startswith("1"):
        digits = digits[1:]
    if len(digits) == 10:
        return f"({digits[0:3]}) {digits[3:6]}-{digits[6:]}"
    return phone or ""


def _full_address(profile: Dict[str, Any]) -> str:
    parts = [profile.get("address", ""), profile.get("city", ""), "CA", profile.get("zip_code", "")]
    return ", ".join([p for p in parts if p]).replace(", CA,", " CA")


def _renewal_date(months: int) -> str:
    return (datetime.utcnow() + timedelta(days=months * 30)).strftime("%Y-%m-%d")


# ---------------------------------------------------------------------------
# Program rules
# ---------------------------------------------------------------------------

def _check_calfresh(p: Dict[str, Any]) -> bool:
    # Disqualifier: large meal plans can make students ineligible even with exemptions.
    # (We treat meal_plan_count as meals/week; 11+ means most meals are provided.)
    if p.get("meal_plan_count", 0) >= 11:
        return False

    limit = _income_limit(CALFRESH_INCOME_LIMITS, p.get("household_size", 1))
    if not (p.get("monthly_income", 0) <= limit and p.get("citizen_or_legal_resident", False)):
        return False

    # Student rule: students 18–49 need an exemption.
    age = p.get("age", 0) or 0
    if 18 <= age <= 49 and p.get("is_student", False):
        return any([
            p.get("work_study", False),
            p.get("cal_grant_a_or_b", False),
            p.get("works_20_hours_week", False),
            p.get("has_dependent_under_12", False),
        ])

    return True


def _prefill_calfresh(p: Dict[str, Any]) -> Dict[str, str]:
    return {
        "Applicant Name": p.get("full_name", ""),
        "Date of Birth": _fmt_date(p.get("date_of_birth", "")),
        "Street Address": p.get("address", ""),
        "City": p.get("city", ""),
        "ZIP": p.get("zip_code", ""),
        "Phone": _fmt_phone(p.get("phone", "")),
        "Monthly Gross Income": f"${p.get('monthly_income', 0)}",
        "Household Size": str(p.get("household_size", 1)),
    }


def _check_medical(p: Dict[str, Any]) -> bool:
    limit = _income_limit(MEDICAL_INCOME_LIMITS, p.get("household_size", 1))
    return (
        p.get("monthly_income", 0) <= limit
        or p.get("age", 0) >= 65
        or p.get("has_disability", False)
        or p.get("pregnant", False)
    )


def _prefill_medical(p: Dict[str, Any]) -> Dict[str, str]:
    citizenship = "U.S. Citizen / Legal Resident" if p.get("citizen_or_legal_resident") else "Other (still may qualify under CA expansion)"
    return {
        "Applicant Name": p.get("full_name", ""),
        "Date of Birth": _fmt_date(p.get("date_of_birth", "")),
        "Street Address": p.get("address", ""),
        "City": p.get("city", ""),
        "ZIP": p.get("zip_code", ""),
        "Phone": _fmt_phone(p.get("phone", "")),
        "Monthly Income": f"${p.get('monthly_income', 0)}",
        "Household Size": str(p.get("household_size", 1)),
        "Citizenship Status": citizenship,
    }


def _check_edd(p: Dict[str, Any]) -> bool:
    return (
        p.get("recently_unemployed", False)
        and p.get("worked_last_18_months", False)
        and not p.get("self_employed", False)
    )


def _prefill_edd(p: Dict[str, Any]) -> Dict[str, str]:
    return {
        "Applicant Name": p.get("full_name", ""),
        "SSN Last 4": p.get("ssn_last4", ""),
        "Phone": _fmt_phone(p.get("phone", "")),
        "Street Address": p.get("address", ""),
        "City": p.get("city", ""),
        "ZIP": p.get("zip_code", ""),
        "Last Employer Name": p.get("last_employer", ""),
        "Date of Separation": _fmt_date(p.get("separation_date", "")),
    }


def _check_general_relief(p: Dict[str, Any]) -> bool:
    age = p.get("age", 0)
    return (
        p.get("monthly_income", 0) < 400
        and 18 <= age < 65
        and p.get("citizen_or_legal_resident", False)
    )


def _prefill_general_relief(p: Dict[str, Any]) -> Dict[str, str]:
    return {
        "Applicant Name": p.get("full_name", ""),
        "Date of Birth": _fmt_date(p.get("date_of_birth", "")),
        "Street Address": p.get("address", ""),
        "City": p.get("city", ""),
        "ZIP": p.get("zip_code", ""),
        "Phone": _fmt_phone(p.get("phone", "")),
    }


def _check_wic(p: Dict[str, Any]) -> bool:
    if not (p.get("pregnant", False) or p.get("has_children_under_5", False)):
        return False
    limit = _income_limit(CALFRESH_INCOME_LIMITS, p.get("household_size", 1))
    return p.get("monthly_income", 0) <= limit


def _prefill_wic(p: Dict[str, Any]) -> Dict[str, str]:
    status = []
    if p.get("pregnant"):
        status.append("Pregnant")
    if p.get("has_children_under_5"):
        status.append("Has child under 5")
    return {
        "Applicant Name": p.get("full_name", ""),
        "Date of Birth": _fmt_date(p.get("date_of_birth", "")),
        "Street Address": p.get("address", ""),
        "City": p.get("city", ""),
        "ZIP": p.get("zip_code", ""),
        "Phone": _fmt_phone(p.get("phone", "")),
        "Household Size": str(p.get("household_size", 1)),
        "Pregnancy/Child Status": ", ".join(status) or "Not specified",
    }


# ---------------------------------------------------------------------------
# Program registry
# ---------------------------------------------------------------------------

PROGRAMS: List[Dict[str, Any]] = [
    {
        "name": "CalFresh",
        "description": "California's food assistance program (SNAP). Provides monthly funds on an EBT card to buy groceries.",
        "form": "CF-285",
        "agency": "Yolo County Health & Human Services",
        "apply_url": "https://www.getcalfresh.org",
        "renewal_months": 12,
        "monthly_value_estimate": "$291 average (1-person household)",
        "monthly_value_low": 291,
        "documents": [
            "Photo ID",
            "Proof of address",
            "Proof of income last 30 days",
            "SSNs for all household members",
            "Bank statements last 30 days",
        ],
        "check": _check_calfresh,
        "prefill": _prefill_calfresh,
    },
    {
        "name": "Medi-Cal",
        "description": "California's Medicaid program. Free or low-cost health coverage including doctor visits, prescriptions, and hospital care.",
        "form": "MC 210",
        "agency": "California Department of Health Care Services",
        "apply_url": "https://www.coveredca.com/medi-cal",
        "renewal_months": 12,
        "monthly_value_estimate": "Up to $500+ in covered care",
        "monthly_value_low": 500,
        "documents": [
            "Photo ID",
            "Proof of CA residency",
            "Proof of income",
            "SSN if available",
            "Immigration documents if applicable",
        ],
        "check": _check_medical,
        "prefill": _prefill_medical,
    },
    {
        "name": "Unemployment Insurance",
        "description": "California EDD unemployment benefits. Weekly cash payments for people who lost a job through no fault of their own.",
        "form": "UI Online Application",
        "agency": "California Employment Development Department (EDD)",
        "apply_url": "https://edd.ca.gov/unemployment",
        "renewal_months": 0,  # certified every 2 weeks
        "monthly_value_estimate": "60-70% of prior wages, up to $450/week",
        "monthly_value_low": 1800,  # ~$450/wk * 4
        "documents": [
            "SSN",
            "Last employer name, address, and phone",
            "Employment dates",
            "Reason for separation",
            "Wage info last 18 months",
        ],
        "check": _check_edd,
        "prefill": _prefill_edd,
    },
    {
        "name": "General Relief",
        "description": "County-level cash assistance for adults with little or no income who don't qualify for other cash aid.",
        "form": "GR Application",
        "agency": "County Social Services",
        "apply_url": "https://www.cdss.ca.gov/general-assistance",
        "renewal_months": 1,
        "monthly_value_estimate": "$221-$337/month cash",
        "monthly_value_low": 221,
        "documents": [
            "Photo ID",
            "CA residency proof",
            "Proof of no/low income",
            "SSN",
        ],
        "check": _check_general_relief,
        "prefill": _prefill_general_relief,
    },
    {
        "name": "WIC",
        "description": "Women, Infants, and Children nutrition program. Food benefits, nutrition education, and health referrals for pregnant women and families with young children.",
        "form": "WIC Application",
        "agency": "California WIC Program",
        "apply_url": "https://www.cdph.ca.gov/programs/wicworks",
        "renewal_months": 6,
        "monthly_value_estimate": "$50-$100/month in food benefits",
        "monthly_value_low": 50,
        "documents": [
            "Proof of identity",
            "Proof of CA residency",
            "Proof of income",
            "Proof of pregnancy or child's age",
        ],
        "check": _check_wic,
        "prefill": _prefill_wic,
    },
]


def _confidence_for(program_name: str, profile: Dict[str, Any]) -> str:
    """Return high/medium/low confidence based on how cleanly the rules pass."""
    income = profile.get("monthly_income", 0)
    hh = profile.get("household_size", 1)

    if program_name == "CalFresh":
        limit = _income_limit(CALFRESH_INCOME_LIMITS, hh)
        if income == 0:
            return "high"
        return "high" if income <= limit * 0.8 else "medium"

    if program_name == "Medi-Cal":
        limit = _income_limit(MEDICAL_INCOME_LIMITS, hh)
        if income <= limit or profile.get("age", 0) >= 65 or profile.get("pregnant"):
            return "high"
        return "medium"

    if program_name == "Unemployment Insurance":
        if profile.get("recently_unemployed") and profile.get("worked_last_18_months"):
            return "high"
        return "medium"

    if program_name == "General Relief":
        return "high" if income < 200 else "medium"

    if program_name == "WIC":
        return "high" if profile.get("pregnant") or profile.get("has_children_under_5") else "low"

    return "medium"


def evaluate(profile: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Run every program's check and return matched programs with full metadata."""
    matches: List[Dict[str, Any]] = []
    for program in PROGRAMS:
        if not program["check"](profile):
            continue
        confidence = _confidence_for(program["name"], profile)
        matches.append({
            "name": program["name"],
            "description": program["description"],
            "confidence": confidence,
            "monthly_value_estimate": program["monthly_value_estimate"],
            "monthly_value_low": program["monthly_value_low"],
            "form": program["form"],
            "agency": program["agency"],
            "apply_url": program["apply_url"],
            "renewal_date": _renewal_date(program["renewal_months"]),
            "documents_needed": program["documents"],
            "prefilled_fields": program["prefill"](profile),
        })
    return matches


def total_monthly_estimate(matches: List[Dict[str, Any]]) -> str:
    """Sum lower-bound monthly values for HIGH and MEDIUM confidence matches only."""
    total = sum(
        m["monthly_value_low"]
        for m in matches
        if m["confidence"] in ("high", "medium")
    )
    return f"up to ${total:,}/month"
