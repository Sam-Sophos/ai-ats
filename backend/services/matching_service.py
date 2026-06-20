import logging
from django.db import transaction

logger = logging.getLogger(__name__)


def match_and_score(application_id: int, extracted_skill_names: list[str]) -> int:
    """
    Matches AI-extracted skills against the job's required skills
    and calculates a match score.

    Steps:
    1. For each extracted skill name, get_or_create a Skill record
    2. Bulk-create ApplicationSkill records (ignore duplicates)
    3. Fetch the job's required skills from JobSkill
    4. Calculate the intersection percentage
    5. Update Application.ai_match_score and save

    Args:
        application_id: The ID of the Application record
        extracted_skill_names: List of skill name strings from the AI

    Returns:
        Integer score from 0 to 100
    """
    from apps.applications.models import Application, ApplicationSkill
    from apps.jobs.models import Skill, JobSkill

    logger.info(
        f'[MatchingService] Scoring application {application_id} '
        f'with {len(extracted_skill_names)} extracted skills.'
    )

    with transaction.atomic():
        # Step 1 — Load the application
        try:
            application = Application.objects.select_related('job').get(
                id=application_id
            )
        except Application.DoesNotExist:
            logger.error(f'[MatchingService] Application {application_id} not found.')
            return 0

        # Step 2 — Get or create Skill records for each extracted skill
        skill_objects = []
        for skill_name in extracted_skill_names:
            if not skill_name or not skill_name.strip():
                continue
            skill, created = Skill.objects.get_or_create(
                skill_name__iexact=skill_name.strip(),
                defaults={'skill_name': skill_name.strip().title()}
            )
            skill_objects.append(skill)

        logger.info(
            f'[MatchingService] Resolved {len(skill_objects)} '
            f'skill objects from database.'
        )

        # Step 3 — Bulk create ApplicationSkill records
        # ignore_conflicts=True safely skips any duplicates
        application_skills = [
            ApplicationSkill(application=application, skill=skill)
            for skill in skill_objects
        ]
        ApplicationSkill.objects.bulk_create(
            application_skills,
            ignore_conflicts=True
        )

        # Step 4 — Get the job's required skill IDs
        job_skill_ids = set(
            JobSkill.objects.filter(job=application.job)
            .values_list('skill_id', flat=True)
        )

        # Step 5 — Get the extracted skill IDs
        extracted_skill_ids = set(skill.id for skill in skill_objects)

        # Step 6 — Calculate the match score
        if not job_skill_ids:
            # If the job has no required skills defined, score is 0
            logger.warning(
                f'[MatchingService] Job {application.job.id} has no '
                f'required skills defined. Score set to 0.'
            )
            score = 0
        else:
            matched_skills = job_skill_ids.intersection(extracted_skill_ids)
            score = round((len(matched_skills) / len(job_skill_ids)) * 100)
            logger.info(
                f'[MatchingService] Matched {len(matched_skills)} of '
                f'{len(job_skill_ids)} required skills. '
                f'Score: {score}/100.'
            )

        # Step 7 — Save the score to the application
        application.ai_match_score = score
        application.save(update_fields=['ai_match_score'])

    return score
