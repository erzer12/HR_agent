# backend/agents/email_agent.py

from typing import Dict

def draft_email(job_details: Dict, candidate_details: Dict, interview_time: str) -> Dict:
    """
    Drafts a personalized interview confirmation email.

    NOTE: This is a MOCKED implementation. In a real application, you would
    replace this with a call to an LLM, providing the job details, candidate
    summary, and interview time as context in the prompt.
    """
    job_title = job_details.get("title", "the role")
    candidate_name = candidate_details.get("candidateName", "there")

    subject = f"Interview Invitation for the {job_title} Position at ResumeRank"

    body = f"""Hi {candidate_name},

Thank you for your application for the {job_title} position. Our team was impressed with your background, especially your experience highlighted in your resume.

We would like to invite you to an interview to discuss your qualifications further. The interview is scheduled for:

**Date & Time:** {interview_time}

Please let us know if this time works for you. We look forward to speaking with you soon.

Best regards,

The Hiring Team
ResumeRank
"""

    return {"subject": subject, "body": body}
