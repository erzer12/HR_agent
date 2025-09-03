# backend/services/resume_processing.py

from typing import Dict
import re
import random

def process_resume(job_description: str, resume_content: str) -> Dict:
    """
    Analyzes a single resume against a job description.

    NOTE: This is a MOCKED implementation. In a real application, you would
    replace the logic inside this function with a call to an LLM service
    (like OpenAI, Anthropic, or Google Gemini) to perform structured data extraction.
    The prompt to the LLM should ask for a JSON object with a specific schema.
    """
    # Mocked LLM response generation for demonstration purposes
    email_match = re.search(r'[\w\.-]+@[\w\.-]+', resume_content)
    email = email_match.group(0) if email_match else "not.found@example.com"

    # A simple way to find a name-like pattern
    name_match = re.search(r'([A-Z][a-z]+(?: [A-Z][a-z]+)?)', resume_content)
    name = name_match.group(0) if name_match else "Jane Doe"

    # Mocked suitability score
    score = round(random.uniform(0.65, 0.98), 2)

    # Mocked summary
    summary = (
        f"This candidate shows strong potential based on their resume. "
        f"They appear to meet several key requirements mentioned in the job description. "
        f"Their skills align well with the role, making them a suitable candidate for an interview."
    )

    return {
        "candidateName": name,
        "candidateEmail": email,
        "suitabilityScore": score,
        "summary": summary,
    }
