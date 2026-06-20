import json
import logging
from abc import ABC, abstractmethod
from django.conf import settings

logger = logging.getLogger(__name__)

EXTRACTION_PROMPT = """
You are an expert resume parser. Extract all technical and professional skills from the resume text below.

Return ONLY a valid JSON object with no additional text, explanation, or markdown formatting.
The JSON must follow this exact structure:
{{
  "extracted_skills": ["skill1", "skill2", "skill3"],
  "years_of_experience": 3,
  "highest_education": "Bachelor's in Computer Science"
}}

Rules:
- extracted_skills must be a flat list of strings
- Each skill should be a clean, standard name (e.g. "Python" not "python programming")
- Include both technical skills (Python, Django, PostgreSQL) and soft skills (Leadership, Communication)
- years_of_experience should be an integer or null if not determinable
- highest_education should be a string or null if not mentioned
- Return ONLY the JSON object, nothing else

Resume text:
{resume_text}
"""


class BaseAIProvider(ABC):
    @abstractmethod
    def extract_skills(self, resume_text: str) -> dict:
        pass


class GeminiProvider(BaseAIProvider):
    def __init__(self):
        from google import genai
        self.client = genai.Client(api_key=settings.GEMINI_API_KEY)
        self.model = 'gemini-2.0-flash'
        logger.info('[AIService] Gemini provider initialised (google-genai SDK).')

    def extract_skills(self, resume_text: str) -> dict:
        logger.info('[AIService] Sending resume to Gemini API.')
        prompt = EXTRACTION_PROMPT.format(resume_text=resume_text)
        response = self.client.models.generate_content(
            model=self.model,
            contents=prompt,
        )
        raw_text = response.text.strip()
        if raw_text.startswith('```'):
            raw_text = raw_text.split('```')[1]
            if raw_text.startswith('json'):
                raw_text = raw_text[4:]
            raw_text = raw_text.strip()
        parsed = json.loads(raw_text)
        tokens_used = 0
        if hasattr(response, 'usage_metadata') and response.usage_metadata:
            tokens_used = getattr(response.usage_metadata, 'total_token_count', 0)
        parsed['tokens_used'] = tokens_used
        logger.info(
            f'[AIService] Gemini returned {len(parsed.get("extracted_skills", []))} '
            f'skills using {tokens_used} tokens.'
        )
        return parsed


class GroqProvider(BaseAIProvider):
    def __init__(self):
        from groq import Groq
        self.client = Groq(api_key=settings.GROQ_API_KEY)
        logger.info('[AIService] Groq provider initialised.')

    def extract_skills(self, resume_text: str) -> dict:
        logger.info('[AIService] Sending resume to Groq API.')
        prompt = EXTRACTION_PROMPT.format(resume_text=resume_text)
        response = self.client.chat.completions.create(
            model='llama-3.1-8b-instant',
            messages=[
                {'role': 'system', 'content': 'You are an expert resume parser. Always respond with valid JSON only.'},
                {'role': 'user', 'content': prompt}
            ],
            temperature=0.1,
        )
        raw_text = response.choices[0].message.content.strip()
        if raw_text.startswith('```'):
            raw_text = raw_text.split('```')[1]
            if raw_text.startswith('json'):
                raw_text = raw_text[4:]
            raw_text = raw_text.strip()
        parsed = json.loads(raw_text)
        tokens_used = 0
        if response.usage:
            tokens_used = response.usage.total_tokens
        parsed['tokens_used'] = tokens_used
        logger.info(
            f'[AIService] Groq returned {len(parsed.get("extracted_skills", []))} '
            f'skills using {tokens_used} tokens.'
        )
        return parsed


def get_ai_provider() -> BaseAIProvider:
    provider = settings.AI_PROVIDER.lower()
    if provider == 'gemini':
        return GeminiProvider()
    elif provider == 'groq':
        return GroqProvider()
    else:
        raise ValueError(f'Unknown AI provider: "{provider}". Must be "gemini" or "groq" in your .env file.')