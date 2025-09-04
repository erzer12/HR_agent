import os
import google.generativeai as genai
import json

# Get the Gemini API key from environment variables
gemini_api_key = os.getenv("GEMINI_API_KEY")

# Configure the Gemini API
genai.configure(api_key=gemini_api_key)

# Create a Gemini model instance
model = genai.GenerativeModel('gemini-pro')

def process_resume(job_description, resume_content):
    """
    Uses the Gemini LLM to analyze a resume against a job description and extract structured data.
    """
    prompt = f"""
    Analyze the following resume based on the provided job description.
    Return a JSON object with the following fields:
    - candidateName: The full name of the candidate.
    - candidateEmail: The email address of the candidate.
    - suitabilityScore: A score from 0 to 1 indicating how well the candidate's skills and experience match the job description.
    - summary: A brief summary of the candidate's qualifications and why they are a good fit for the role.

    Job Description:
    {job_description}

    Resume:
    {resume_content}
    """

    try:
        response = model.generate_content(prompt)
        # The response is in markdown format, so we need to clean it up
        cleaned_response = response.text.strip().replace('```json', '').replace('```', '')
        return json.loads(cleaned_response)
    except Exception as e:
        print(f"Error processing resume with Gemini: {e}")
        # Fallback to a default error response
        return {
            "candidateName": "N/A",
            "candidateEmail": "N/A",
            "suitabilityScore": 0,
            "summary": "Error processing resume."
        }
