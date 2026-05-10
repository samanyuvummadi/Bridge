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

def _norm_city(p: Dict[str, Any]) -> str:
    return (p.get("city", "") or "").strip().lower()

def _zip_prefix(p: Dict[str, Any], n: int = 3) -> str:
    z = (p.get("zip_code", "") or "").strip()
    return z[:n]

def _income_under_percent_fpl(p: Dict[str, Any], percent: int) -> bool:
    """
    Approximate percent-of-FPL checks using the CalFresh gross monthly table
    as the baseline tier, then scaling linearly.

    This is hackathon-grade (good enough for screening UX) and is not an official determination.
    """
    hh = p.get("household_size", 1)
    baseline = _income_limit(CALFRESH_INCOME_LIMITS, hh)  # ~CalFresh gross tiers (close to 130–200% FPL by household)
    scaled = int(baseline * (percent / 130.0))
    return p.get("monthly_income", 0) <= scaled


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
# Essential services + CalWORKs (lightweight hackathon heuristics)
# ---------------------------------------------------------------------------

def _check_calworks(p: Dict[str, Any]) -> bool:
    # CalWORKs generally requires children in the home and very low income.
    # We approximate this with "has_children_under_5 OR household_size > 1".
    if not (p.get("has_children_under_5", False) or p.get("household_size", 1) > 1):
        return False
    limit = _income_limit(CALFRESH_INCOME_LIMITS, p.get("household_size", 1))
    return p.get("monthly_income", 0) <= limit and p.get("citizen_or_legal_resident", False)


def _prefill_calworks(p: Dict[str, Any]) -> Dict[str, str]:
    return {
        "Applicant Name": p.get("full_name", ""),
        "Date of Birth": _fmt_date(p.get("date_of_birth", "")),
        "Street Address": p.get("address", ""),
        "City": p.get("city", ""),
        "ZIP": p.get("zip_code", ""),
        "Phone": _fmt_phone(p.get("phone", "")),
        "Household Size": str(p.get("household_size", 1)),
        "Monthly Income": f"${p.get('monthly_income', 0)}",
    }


def _check_internet_subsidy(p: Dict[str, Any]) -> bool:
    # A generic low-income internet discount screening.
    limit = _income_limit(CALFRESH_INCOME_LIMITS, p.get("household_size", 1))
    return p.get("monthly_income", 0) <= limit * 1.2


def _prefill_internet_subsidy(p: Dict[str, Any]) -> Dict[str, str]:
    return {
        "Applicant Name": p.get("full_name", ""),
        "Service Address": _full_address(p),
        "Phone": _fmt_phone(p.get("phone", "")),
        "Household Size": str(p.get("household_size", 1)),
        "Monthly Income": f"${p.get('monthly_income', 0)}",
    }


def _check_smud_energyhelp(p: Dict[str, Any]) -> bool:
    return _zip_prefix(p) == "958" and _income_under_percent_fpl(p, 200)


def _prefill_smud_energyhelp(p: Dict[str, Any]) -> Dict[str, str]:
    return {
        "Applicant Name": p.get("full_name", ""),
        "Service Address": _full_address(p),
        "Phone": _fmt_phone(p.get("phone", "")),
        "Household Size": str(p.get("household_size", 1)),
        "Monthly Income": f"${p.get('monthly_income', 0)}",
    }


def _check_pge_care_fera(p: Dict[str, Any]) -> bool:
    return _zip_prefix(p) in ("956", "957") and _income_under_percent_fpl(p, 200)


def _prefill_pge_care_fera(p: Dict[str, Any]) -> Dict[str, str]:
    return {
        "Applicant Name": p.get("full_name", ""),
        "Service Address": _full_address(p),
        "Phone": _fmt_phone(p.get("phone", "")),
        "Household Size": str(p.get("household_size", 1)),
        "Monthly Income": f"${p.get('monthly_income', 0)}",
    }


def _check_utility_discounts(p: Dict[str, Any]) -> bool:
    # A generic utility discount screening for low-income households.
    limit = _income_limit(CALFRESH_INCOME_LIMITS, p.get("household_size", 1))
    return p.get("monthly_income", 0) <= limit * 1.2


def _prefill_utility_discounts(p: Dict[str, Any]) -> Dict[str, str]:
    return {
        "Applicant Name": p.get("full_name", ""),
        "Service Address": _full_address(p),
        "Phone": _fmt_phone(p.get("phone", "")),
        "Household Size": str(p.get("household_size", 1)),
        "Monthly Income": f"${p.get('monthly_income', 0)}",
    }


def _check_transit_fare_reduction(p: Dict[str, Any]) -> bool:
    # Transit discounts are typically available to low-income riders and/or seniors.
    # We approximate with low income OR age >= 65.
    limit = _income_limit(CALFRESH_INCOME_LIMITS, p.get("household_size", 1))
    return p.get("monthly_income", 0) <= limit * 1.2 or p.get("age", 0) >= 65


def _prefill_transit_fare_reduction(p: Dict[str, Any]) -> Dict[str, str]:
    return {
        "Applicant Name": p.get("full_name", ""),
        "Date of Birth": _fmt_date(p.get("date_of_birth", "")),
        "City": p.get("city", ""),
        "ZIP": p.get("zip_code", ""),
        "Phone": _fmt_phone(p.get("phone", "")),
    }


def _check_sacrt_discount(p: Dict[str, Any]) -> bool:
    city = _norm_city(p)
    if city != "sacramento":
        return False
    return bool(p.get("is_student", False)) or _income_under_percent_fpl(p, 150)


def _prefill_sacrt_discount(p: Dict[str, Any]) -> Dict[str, str]:
    return {
        "Applicant Name": p.get("full_name", ""),
        "Date of Birth": _fmt_date(p.get("date_of_birth", "")),
        "City": p.get("city", ""),
        "ZIP": p.get("zip_code", ""),
        "Phone": _fmt_phone(p.get("phone", "")),
        "Student Status": "Yes" if p.get("is_student", False) else "No",
    }


def _check_yolobus_discount(p: Dict[str, Any]) -> bool:
    city = _norm_city(p)
    if city not in ("davis", "woodland"):
        return False
    return bool(p.get("is_student", False)) or _income_under_percent_fpl(p, 150)


def _prefill_yolobus_discount(p: Dict[str, Any]) -> Dict[str, str]:
    return {
        "Applicant Name": p.get("full_name", ""),
        "Date of Birth": _fmt_date(p.get("date_of_birth", "")),
        "City": p.get("city", ""),
        "ZIP": p.get("zip_code", ""),
        "Phone": _fmt_phone(p.get("phone", "")),
        "Student Status": "Yes" if p.get("is_student", False) else "No",
    }


def _check_library_of_things(p: Dict[str, Any]) -> bool:
    # Auto-match for local residents (Sacramento + Yolo corridor by common prefixes/cities).
    zp = _zip_prefix(p)
    city = _norm_city(p)
    return zp in ("958", "956", "957") or city in ("sacramento", "davis", "woodland")


def _prefill_library_of_things(p: Dict[str, Any]) -> Dict[str, str]:
    return {
        "Applicant Name": p.get("full_name", ""),
        "Home Address": _full_address(p),
        "Phone": _fmt_phone(p.get("phone", "")),
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
    {
        "name": "CalWORKs",
        "description": "Cash aid and supportive services for families with children in California.",
        "form": "CalWORKs Application",
        "agency": "California Department of Social Services",
        "apply_url": "https://www.cdss.ca.gov/calworks",
        "renewal_months": 12,
        "monthly_value_estimate": "$300-$900/month cash support (varies)",
        "monthly_value_low": 300,
        "documents": [
            "Photo ID",
            "Proof of address",
            "Proof of income (last 30 days)",
            "Proof of children in the household",
        ],
        "check": _check_calworks,
        "prefill": _prefill_calworks,
    },
    {
        "name": "SMUD EnergyHELP",
        "description": "This utility discount is applied directly to your SMUD bill if your household meets income guidelines.",
        "form": "SMUD EnergyHELP Application",
        "agency": "Sacramento Municipal Utility District (SMUD)",
        "apply_url": "https://www.smud.org/en/Customer-Support/Financial-assistance/Energy-assistance",
        "renewal_months": 12,
        "monthly_value_estimate": "Estimated $40/month bill reduction",
        "monthly_value_low": 40,
        "documents": [
            "Recent SMUD bill (or account number)",
            "Proof of income (last 30 days)",
            "Proof of address",
        ],
        "check": _check_smud_energyhelp,
        "prefill": _prefill_smud_energyhelp,
    },
    {
        "name": "PG&E CARE/FERA",
        "description": "This discount is applied to your PG&E electric/gas bill through CARE/FERA if you meet income guidelines.",
        "form": "PG&E CARE/FERA Enrollment",
        "agency": "Pacific Gas & Electric (PG&E)",
        "apply_url": "https://www.pge.com/en/account/billing-and-assistance/financial-assistance/care-fera.html",
        "renewal_months": 12,
        "monthly_value_estimate": "Estimated $40/month bill reduction",
        "monthly_value_low": 40,
        "documents": [
            "Recent PG&E bill (or account number)",
            "Proof of income (last 30 days)",
            "Proof of address",
        ],
        "check": _check_pge_care_fera,
        "prefill": _prefill_pge_care_fera,
    },
    {
        "name": "SacRT RydeFree (Student) or Low-Income Fare",
        "description": "Reduced fares through Sacramento Regional Transit (SacRT) for students or income-qualified riders.",
        "form": "SacRT Discount Fare Application",
        "agency": "Sacramento Regional Transit (SacRT)",
        "apply_url": "https://www.sacrt.com/fares/",
        "renewal_months": 12,
        "monthly_value_estimate": "Estimated $10/month transit savings",
        "monthly_value_low": 10,
        "documents": [
            "Student ID (if applicable)",
            "Proof of income (last 30 days) if applying as low-income",
            "Photo ID",
        ],
        "check": _check_sacrt_discount,
        "prefill": _prefill_sacrt_discount,
    },
    {
        "name": "Yolobus Reduced Fare",
        "description": "Reduced fares through Yolobus for students or income-qualified riders in Yolo County.",
        "form": "Yolobus Reduced Fare Application",
        "agency": "Yolobus (Yolo County Transportation District)",
        "apply_url": "https://yolobus.com/fares/",
        "renewal_months": 12,
        "monthly_value_estimate": "Estimated $10/month transit savings",
        "monthly_value_low": 10,
        "documents": [
            "Student ID (if applicable)",
            "Proof of income (last 30 days) if applying as low-income",
            "Photo ID",
        ],
        "check": _check_yolobus_discount,
        "prefill": _prefill_yolobus_discount,
    },
    {
        "name": "Sacramento Public Library — Library of Things",
        "description": "Borrow laptops, hotspots, tools, and other items from Sacramento Public Library to reduce household costs.",
        "form": "Library Card Signup",
        "agency": "Sacramento Public Library",
        "apply_url": "https://www.saclibrary.org/",
        "renewal_months": 12,
        "monthly_value_estimate": "Estimated $15/month savings (varies)",
        "monthly_value_low": 15,
        "documents": [
            "Photo ID",
            "Proof of address (for library card)",
        ],
        "check": _check_library_of_things,
        "prefill": _prefill_library_of_things,
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
