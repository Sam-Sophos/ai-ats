import logging
from pdfminer.high_level import extract_text
from pdfminer.pdfparser import PDFSyntaxError

logger = logging.getLogger(__name__)

# Maximum characters to send to the AI API
# Keeps us within token limits for free-tier APIs
MAX_RESUME_LENGTH = 8000


class ResumeParseError(Exception):
    """Raised when a resume cannot be parsed."""
    pass


def extract_text_from_pdf(file_path: str) -> str:
    """
    Extracts plain text from a PDF resume file.

    Args:
        file_path: Absolute path to the PDF file on disk.

    Returns:
        Extracted text string, truncated to MAX_RESUME_LENGTH characters.

    Raises:
        ResumeParseError: If the file cannot be read, is encrypted,
                          or contains no extractable text.
    """
    logger.info(f'[ResumeParser] Extracting text from: {file_path}')

    try:
        text = extract_text(file_path)
    except PDFSyntaxError as e:
        raise ResumeParseError(f'Invalid or corrupted PDF file: {e}')
    except FileNotFoundError:
        raise ResumeParseError(f'Resume file not found at path: {file_path}')
    except Exception as e:
        raise ResumeParseError(f'Unexpected error reading PDF: {e}')

    if not text or not text.strip():
        raise ResumeParseError(
            'No text could be extracted from this PDF. '
            'The file may be a scanned image or encrypted.'
        )

    # Clean up excessive whitespace
    cleaned_text = ' '.join(text.split())

    # Truncate to avoid exceeding AI API token limits
    if len(cleaned_text) > MAX_RESUME_LENGTH:
        logger.warning(
            f'[ResumeParser] Resume text truncated from '
            f'{len(cleaned_text)} to {MAX_RESUME_LENGTH} characters.'
        )
        cleaned_text = cleaned_text[:MAX_RESUME_LENGTH]

    logger.info(
        f'[ResumeParser] Successfully extracted '
        f'{len(cleaned_text)} characters.'
    )

    return cleaned_text
