from rest_framework import serializers
from .models import MessageTemplate, CommunicationsLog
from apps.accounts.serializers import UserSerializer
from apps.applications.serializers import ApplicationListSerializer


class MessageTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = MessageTemplate
        fields = [
            'id',
            'template_name',
            'email_subject',
            'email_body',
        ]


class CommunicationsLogSerializer(serializers.ModelSerializer):
    sender = UserSerializer(read_only=True)
    template = MessageTemplateSerializer(read_only=True)
    application = ApplicationListSerializer(read_only=True)

    class Meta:
        model = CommunicationsLog
        fields = [
            'id',
            'application',
            'sender',
            'template',
            'sent_date',
            'message_content',
        ]
        read_only_fields = ['sent_date', 'sender']


class SendCommunicationSerializer(serializers.Serializer):
    """
    Serializer for the send communication action.
    Validates the input before dispatching an email.
    """
    application_id = serializers.IntegerField()
    template_id = serializers.IntegerField()

    def validate_application_id(self, value):
        from apps.applications.models import Application
        if not Application.objects.filter(id=value).exists():
            raise serializers.ValidationError(
                f'Application with id {value} does not exist.'
            )
        return value

    def validate_template_id(self, value):
        if not MessageTemplate.objects.filter(id=value).exists():
            raise serializers.ValidationError(
                f'Template with id {value} does not exist.'
            )
        return value
