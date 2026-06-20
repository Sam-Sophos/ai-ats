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
