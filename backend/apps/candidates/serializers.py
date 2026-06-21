from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework import serializers
from .models import Candidate


class CandidateSerializer(serializers.ModelSerializer):
    application_count = serializers.SerializerMethodField()

    class Meta:
        model = Candidate
        fields = [
            'id',
            'first_name',
            'last_name',
            'email',
            'phone',
            'application_count',
        ]

    def get_application_count(self, obj):
        """Returns how many jobs this candidate has applied to."""
        return obj.applications.count()


class CandidateWriteSerializer(serializers.ModelSerializer):
    """
    Serializer for creating and updating candidates.
    Excludes the computed application_count field.
    """
    class Meta:
        model = Candidate
        fields = [
            'id',
            'first_name',
            'last_name',
            'email',
            'phone',
        ]

    def validate_email(self, value):
        """Normalize email to lowercase before saving."""
        return value.lower().strip()
def get_tokens_for_candidate(candidate):
    """
    Issues a JWT pair for a candidate, using 'candidate_id' as the
    identifying claim instead of the standard 'user_id' — see
    authentication.py for why that distinction matters.
    """
    refresh = RefreshToken()
    refresh['candidate_id'] = candidate.id
    refresh['email'] = candidate.email
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }


class CandidateRegisterSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=100)
    last_name = serializers.CharField(max_length=100)
    email = serializers.EmailField()
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, min_length=8)

    def validate_email(self, value):
        value = value.lower().strip()
        existing = Candidate.objects.filter(email=value).first()
        if existing and existing.has_account:
            raise serializers.ValidationError(
                'An account already exists with this email. Try logging in instead.'
            )
        return value

    def create(self, validated_data):
        password = validated_data.pop('password')
        email = validated_data['email']

        # Claim an existing Candidate record (e.g. one a recruiter added
        # manually) if one exists with this email; otherwise create new.
        candidate, _ = Candidate.objects.update_or_create(
            email=email,
            defaults={
                'first_name': validated_data['first_name'],
                'last_name': validated_data['last_name'],
                'phone': validated_data.get('phone', ''),
            }
        )
        candidate.set_password(password)
        candidate.save(update_fields=['password'])
        return candidate


class CandidateLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        email = data['email'].lower().strip()
        try:
            candidate = Candidate.objects.get(email=email)
        except Candidate.DoesNotExist:
            raise serializers.ValidationError('Invalid email or password.')

        if not candidate.check_password(data['password']):
            raise serializers.ValidationError('Invalid email or password.')

        data['candidate'] = candidate
        return data