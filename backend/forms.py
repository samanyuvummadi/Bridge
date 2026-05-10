"""Form pre-fill PDF summary generation using reportlab.

Real government PDFs are unreliable to fill (scanned, non-fillable, inconsistent).
Instead we generate a clean printable summary the user can bring to an appointment
or use as reference while completing the official online application.
"""
import io
from typing import Dict, Any, List

from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


DISCLAIMER = (
    "BenefitBridge is a screening tool, not a legal benefits determination. "
    "Your eligibility is confirmed when you complete the official application."
)


def _styles():
    base = getSampleStyleSheet()
    base.add(ParagraphStyle(
        name="BBHeader", fontName="Helvetica-Bold", fontSize=20,
        textColor=colors.HexColor("#1B5E20"), spaceAfter=4,
    ))
    base.add(ParagraphStyle(
        name="BBSection", fontName="Helvetica-Bold", fontSize=13,
        textColor=colors.HexColor("#1B5E20"), spaceBefore=14, spaceAfter=6,
    ))
    base.add(ParagraphStyle(
        name="BBBody", fontName="Helvetica", fontSize=10,
        textColor=colors.black, leading=14,
    ))
    base.add(ParagraphStyle(
        name="BBSmall", fontName="Helvetica-Oblique", fontSize=8,
        textColor=colors.grey, leading=10,
    ))
    return base


def generate_form_summary_pdf(program: Dict[str, Any], profile: Dict[str, Any]) -> bytes:
    """Build a clean PDF summary for a single program. Returns the PDF bytes."""
    styles = _styles()
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=letter,
        leftMargin=0.7 * inch, rightMargin=0.7 * inch,
        topMargin=0.7 * inch, bottomMargin=0.7 * inch,
    )

    story: List = []
    story.append(Paragraph("BenefitBridge", styles["BBHeader"]))
    story.append(Paragraph("Pre-Filled Application Summary", styles["BBBody"]))
    story.append(Spacer(1, 0.15 * inch))

    story.append(Paragraph(program.get("name", ""), styles["BBSection"]))
    story.append(Paragraph(program.get("agency", ""), styles["BBBody"]))
    story.append(Paragraph(program.get("description", ""), styles["BBBody"]))

    # Pre-filled info
    story.append(Paragraph("Your Pre-Filled Information", styles["BBSection"]))
    fields = program.get("prefilled_fields", {}) or {}
    if fields:
        rows = [[k, v] for k, v in fields.items()]
        table = Table(rows, colWidths=[2.0 * inch, 4.0 * inch])
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#F1F8E9")),
            ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#1B5E20")),
            ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
            ("FONTNAME", (1, 0), (1, -1), "Helvetica"),
            ("FONTSIZE", (0, 0), (-1, -1), 10),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("GRID", (0, 0), (-1, -1), 0.25, colors.lightgrey),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ]))
        story.append(table)

    # Documents
    story.append(Paragraph("Documents You Need", styles["BBSection"]))
    for doc_name in program.get("documents_needed", []) or []:
        story.append(Paragraph(f"☐ &nbsp; {doc_name}", styles["BBBody"]))

    # How to apply
    story.append(Paragraph("How to Apply", styles["BBSection"]))
    apply_url = program.get("apply_url", "")
    if apply_url:
        story.append(Paragraph(
            f'Apply online: <link href="{apply_url}" color="#1B5E20"><u>{apply_url}</u></link>',
            styles["BBBody"],
        ))
    story.append(Paragraph(f"Agency: {program.get('agency', '')}", styles["BBBody"]))

    story.append(Spacer(1, 0.2 * inch))
    story.append(Paragraph(
        "This is a summary prepared by BenefitBridge. Bring this document and your "
        f"supporting documents to your appointment or use it to complete the "
        f"official online application at {apply_url}.",
        styles["BBSmall"],
    ))
    story.append(Spacer(1, 0.1 * inch))
    story.append(Paragraph(DISCLAIMER, styles["BBSmall"]))

    doc.build(story)
    return buffer.getvalue()


def generate_all_summaries(
    matched_programs: List[Dict[str, Any]],
    profile: Dict[str, Any],
) -> Dict[str, bytes]:
    return {
        p["name"]: generate_form_summary_pdf(p, profile)
        for p in matched_programs
    }
