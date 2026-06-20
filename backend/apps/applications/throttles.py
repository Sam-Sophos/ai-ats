from rest_framework.throttling import UserRateThrottle


class AISubmitThrottle(UserRateThrottle):
    """
    Stricter throttle specifically for the application creation endpoint.
    This endpoint triggers a real AI API call (costs tokens and money on
    paid tiers, and counts against free-tier daily quotas), so it gets
    a much tighter limit than the rest of the API.

    Rate is configured in settings.py under DEFAULT_THROTTLE_RATES['ai_submit'].
    """
    scope = 'ai_submit'
