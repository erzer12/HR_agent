import os
import google.generativeai as genai
from typing import Dict

# Get the Gemini API key from environment variables
gemini_api_key = os.getenv("GEMINI_API_KEY")

# Configure the Gemini API
genai.configure(api_key=gemini_api_key)

# Create a Gemini model instance
model = genai.GenerativeModel('gemini-pro')

def draft_email(job_details: Dict, candidate_details: Dict, interview_time: str) -> Dict:
    """
    Uses the Gemini LLM to draft a personalized interview confirmation email.
    """
    job_title = job_details.get("title", "the role")
    candidate_name = candidate_details.get("candidateName", "there")

    prompt = f"""
    Draft a friendly and professional email to a candidate named {candidate_name} inviting them to an interview for the {job_title} position.

    The interview is scheduled for {interview_time}.

    The email should:
    - Have a clear subject line.
    - Thank them for their application.
    - Mention that the team was impressed with their background.
    - Clearly state the date and time of the interview.
    - Ask them to confirm if the time works for them.
    - Be signed by "The Hiring Team, ResumeRank".

    Return a JSON object with two keys: "subject" and "body".
    """

    try:
        response = model.generate_content(prompt)
        cleaned_response = response.text.strip().replace('```json', '').replace('```', '')
        return json.loads(cleaned_response)
    except Exception as e:
        print(f"Error drafting email with Gemini: {e}")
        # Fallback to a default template
        return {
            "subject": f"Interview Invitation for the {job_title} Position at ResumeRank",
            "body": f"""Hi {candidate_name},

Thank you for your application for the {job_title} position. Our team was impressed with your background.

We would like to invite you to an interview scheduled for:

**Date & Time:** {interview_time}

Please let us know if this time works for you.

Best regards,
The Hiring Team
ResumeRank"""
        }
