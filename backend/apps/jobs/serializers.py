from rest_framework import serializers
from .models import Job, Skill, JobSkill
from apps.accounts.serializers import UserSerializer, DepartmentSerializer


class SkillSerializer(serializers.ModelSerializer):
    class Meta:
        model = Skill
        fields = ['id', 'skill_name']


class JobSkillSerializer(serializers.ModelSerializer):
    skill = SkillSerializer(read_only=True)

    class Meta:
        model = JobSkill
        fields = ['skill']


class JobListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for list views.
    Avoids heavy nesting — only returns what the table needs.
    """
    department_name = serializers.CharField(
        source='department.name',
        read_only=True
    )
    created_by_name = serializers.CharField(
        source='created_by.get_full_name',
        read_only=True
    )
    skill_count = serializers.IntegerField(
        source='skills.count',
        read_only=True
    )

    class Meta:
        model = Job
        fields = [
            'id',
            'title',
            'department_name',
            'created_by_name',
            'skill_count',
            'created_at',
        ]


class JobDetailSerializer(serializers.ModelSerializer):
    """
    Full serializer for detail views.
    Returns all fields with nested objects.
    """
    department = DepartmentSerializer(read_only=True)
    created_by = UserSerializer(read_only=True)
    skills = SkillSerializer(many=True, read_only=True)
    application_count = serializers.IntegerField(
        source='applications.count',
        read_only=True
    )

    class Meta:
        model = Job
        fields = [
            'id',
            'title',
            'description',
            'department',
            'created_by',
            'skills',
            'application_count',
            'created_at',
        ]


class JobWriteSerializer(serializers.ModelSerializer):
    """
    Serializer for creating and updating jobs.
    Accepts a list of skill_ids instead of nested objects.
    Manages JobSkill records atomically.
    """
    skill_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        default=list
    )

    class Meta:
        model = Job
        fields = [
            'id',
            'title',
            'description',
            'department',
            'skill_ids',
        ]

    def create(self, validated_data):
        from django.db import transaction
        skill_ids = validated_data.pop('skill_ids', [])

        with transaction.atomic():
            # Set created_by from the request user
            validated_data['created_by'] = self.context['request'].user
            job = Job.objects.create(**validated_data)

            # Create JobSkill records for each skill
            for skill_id in skill_ids:
                try:
                    skill = Skill.objects.get(id=skill_id)
                    JobSkill.objects.create(job=job, skill=skill)
                except Skill.DoesNotExist:
                    pass

        return job

    def update(self, instance, validated_data):
        from django.db import transaction
        skill_ids = validated_data.pop('skill_ids', None)

        with transaction.atomic():
            # Update job fields
            for attr, value in validated_data.items():
                setattr(instance, attr, value)
            instance.save()

            # If skill_ids were provided, replace all existing skills
            if skill_ids is not None:
                JobSkill.objects.filter(job=instance).delete()
                for skill_id in skill_ids:
                    try:
                        skill = Skill.objects.get(id=skill_id)
                        JobSkill.objects.create(job=instance, skill=skill)
                    except Skill.DoesNotExist:
                        pass

        return instance
