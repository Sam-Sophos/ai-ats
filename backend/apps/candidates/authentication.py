from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import AuthenticationFailed
from .models import Candidate


class CandidateJWTAuthentication(JWTAuthentication):
    """
    Validates the JWT exactly like the normal recruiter authentication
    (same signature check, same expiry check), but resolves identity
    against the Candidate table using a 'candidate_id' claim instead
    of the standard 'user_id' claim.

    If a token doesn't have a 'candidate_id' claim, authenticate()
    returns None (not an error) so that other authenticators — like
    the default recruiter JWTAuthentication — get a chance to handle
    it instead. This lets a single endpoint (like task polling) accept
    either a recruiter token or a candidate token correctly.
    """

    def authenticate(self, request):
        header = self.get_header(request)
        if header is None:
            return None
        raw_token = self.get_raw_token(header)
        if raw_token is None:
            return None

        validated_token = self.get_validated_token(raw_token)

        if 'candidate_id' not in validated_token:
            return None  # not a candidate token — let other authenticators try

        return self.get_user(validated_token), validated_token

    def get_user(self, validated_token):
        candidate_id = validated_token['candidate_id']
        try:
            candidate = Candidate.objects.get(id=candidate_id)
        except Candidate.DoesNotExist:
            raise AuthenticationFailed('Candidate not found.', code='candidate_not_found')

        if not candidate.has_account:
            raise AuthenticationFailed('This candidate account is not active.', code='no_account')

        return candidate