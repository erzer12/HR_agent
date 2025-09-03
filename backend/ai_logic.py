# backend/ai_logic.py
import google.generativeai as genai
import os
from dotenv import load_dotenv
from pydantic import BaseModel, Field
from typing import List, Optional
from fastapi import UploadFile

load_dotenv() # Loads environment variables from a .env file

# Configure the Gemini API
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

# --- Pydantic Schemas (like Zod in TypeScript) ---
class CandidateRanking(BaseModel):
    candidateIndex: int = Field(description="The index of the candidate in the input resumes array.")
    candidateName: str = Field(description="The full name of the candidate, extracted from the resume. If the document is not a resume, return 'N/A'.")
    candidateEmail: Optional[str] = Field(default=None, description="The email address of the candidate, extracted from the resume.")
    suitabilityScore: float = Field(description="A score between 0 and 1 representing the candidate’s suitability for the role, with 1 being the most suitable. If the document is not a resume, the score must be 0.")
    summary: str = Field(description="A brief summary of the candidate’s qualifications and experience, highlighting their suitability for the role. If the document is not a resume, explain why it is not suitable.")

class RankCandidatesOutput(BaseModel):
    rankings: List[CandidateRanking] = Field(description="The rankings of the candidates.")

class EmailContent(BaseModel):
    subject: str = Field(description="The subject line of the email.")
    body: str = Field(description="The body content of the email, formatted in Markdown.")

class DraftEmailOutput(BaseModel):
    email: EmailContent

# --- AI Functions ---

async def rank_candidates_from_files(job_description: str, resume_files: List[UploadFile]) -> RankCandidatesOutput:
    model = genai.GenerativeModel(
        model_name='gemini-1.5-flash',
        generation_config={"response_mime_type": "application/json", "temperature": 0.0},
        system_instruction="""You are an expert HR assistant. You will rank candidates based on their resumes against a job description.
From each resume, you MUST extract the candidate's full name and email address.

If a provided document is not a resume (e.g., it is a code file, an invoice, or other irrelevant document), you must still process it. In such cases:
1.  Set the candidate's name to 'N/A'.
2.  Set the suitability score to 0.
3.  Provide a summary explaining that the document is not a valid resume.
4.  Omit the email address field.

You must output a valid JSON object that conforms to the provided schema.
"""
    )

    # Prepare files for the prompt
    prompt_parts = [
        "Job Description:",
        job_description,
        "\nResumes:"
    ]
    for index, file in enumerate(resume_files):
        # Ensure we are at the beginning of the file
        file.file.seek(0)
        # The genai library can take file objects directly
        prompt_parts.append(f"Candidate {index}:")
        prompt_parts.append(file)

    response = await model.generate_content_async(
        prompt_parts,
        generation_config=genai.GenerationConfig(
            response_schema=RankCandidatesOutput
        )
    )

    # The model response text should be a JSON string matching the schema
    return RankCandidatesOutput.parse_raw(response.text)

async def draft_personalized_email(candidate_name: str, job_title: str) -> DraftEmailOutput:
    model = genai.GenerativeModel(
        model_name='gemini-1.5-flash',
        generation_config={"response_mime_type": "application/json", "temperature": 0.5},
        system_instruction="""You are an expert HR assistant. Your task is to draft a personalized confirmation email to a job candidate who has been selected for the next round.
The email should be warm, professional, and encouraging.
It must include the candidate's name and the job title they applied for.
You must output a valid JSON object that conforms to the provided schema.
"""
    )

    prompt = f"""Draft an email for a candidate named {candidate_name} who has been selected for the next round for the position of {job_title}.
    
    The next step will be scheduling an interview, but do not include scheduling details in this email. Just confirm their selection for the next stage.
    """

    response = await model.generate_content_async(
        prompt,
        generation_config=genai.GenerationConfig(
            response_schema=DraftEmailOutput
        )
    )
    return DraftEmailOutput.parse_raw(response.text)
