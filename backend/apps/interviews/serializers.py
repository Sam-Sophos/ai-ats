from rest_framework import serializers
from .models import Interview, InterviewParticipant, Evaluation
from apps.accounts.serializers import UserSerializer
from apps.applications.serializers import ApplicationListSerializer


class EvaluationSerializer(serializers.ModelSerializer):
    evaluator = UserSerializer(read_only=True)

    class Meta:
        model = Evaluation
        fields = [
            'id',
            'evaluator',
            'score',
            'written_feedback',
            'created_at',
        ]
        read_only_fields = ['evaluator', 'created_at']


class EvaluationWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Evaluation
        fields = [
            'id',
            'interview',
            'score',
            'written_feedback',
        ]

    def validate_score(self, value):
        if not 0 <= value <= 10:
            raise serializers.ValidationError('Score must be between 0 and 10.')
        return value

    def create(self, validated_data):
        # Automatically set the evaluator to the requesting user
        validated_data['evaluator'] = self.context['request'].user
        return super().create(validated_data)


class InterviewParticipantSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = InterviewParticipant
        fields = ['id', 'user']


class InterviewListSerializer(serializers.ModelSerializer):
    application = ApplicationListSerializer(read_only=True)
    participant_count = serializers.IntegerField(
        source='participants.count',
        read_only=True
    )

    class Meta:
        model = Interview
        fields = [
            'id',
            'application',
            'scheduled_date',
            'meeting_link',
            'participant_count',
        ]


class InterviewDetailSerializer(serializers.ModelSerializer):
    application = ApplicationListSerializer(read_only=True)
    participants = UserSerializer(many=True, read_only=True)
    evaluations = EvaluationSerializer(many=True, read_only=True)

    class Meta:
        model = Interview
        fields = [
            'id',
            'application',
            'scheduled_date',
            'meeting_link',
            'participants',
            'evaluations',
        ]


class InterviewWriteSerializer(serializers.ModelSerializer):
    """
    Accepts participant_ids as a list of user IDs.
    Automatically creates InterviewParticipant records on save.
    """
    participant_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        default=list
    )

    class Meta:
        model = Interview
        fields = [
            'id',
            'application',
            'scheduled_date',
            'meeting_link',
            'participant_ids',
        ]

    def create(self, validated_data):
        from django.db import transaction
        from apps.accounts.models import User

        participant_ids = validated_data.pop('participant_ids', [])

        with transaction.atomic():
            interview = Interview.objects.create(**validated_data)

            for user_id in participant_ids:
                try:
                    user = User.objects.get(id=user_id)
                    InterviewParticipant.objects.create(
                        interview=interview,
                        user=user
                    )
                except User.DoesNotExist:
                    pass

        return interview

    def update(self, instance, validated_data):
        from django.db import transaction
        from apps.accounts.models import User

        participant_ids = validated_data.pop('participant_ids', None)

        with transaction.atomic():
            for attr, value in validated_data.items():
                setattr(instance, attr, value)
            instance.save()

            if participant_ids is not None:
                InterviewParticipant.objects.filter(interview=instance).delete()
                for user_id in participant_ids:
                    try:
                        user = User.objects.get(id=user_id)
                        InterviewParticipant.objects.create(
                            interview=instance,
                            user=user
                        )
                    except User.DoesNotExist:
                        pass

        return instance
