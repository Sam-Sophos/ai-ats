from rest_framework.permissions import BasePermission


class IsHRManagerOrAdmin(BasePermission):
    """
    Grants access only to users whose role is HR_MANAGER or ADMIN.
    Used to protect endpoints that create or modify core data:
    - Creating job postings
    - Moving applications through the pipeline
    - Overriding AI match scores
    - Sending communications
    """
    message = 'Access denied. You must be an HR Manager or Admin to perform this action.'

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if not request.user.role:
            return False
        return request.user.role.title in ['HR_MANAGER', 'ADMIN']


class IsAdminOnly(BasePermission):
    """
    Grants access only to users whose role is ADMIN.
    Used to protect the most sensitive operations:
    - Creating/deleting users
    - Managing roles and departments
    """
    message = 'Access denied. You must be an Admin to perform this action.'

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if not request.user.role:
            return False
        return request.user.role.title == 'ADMIN'


class IsOwnerOrHRManager(BasePermission):
    """
    Object-level permission.
    Grants access if the requesting user created the object,
    or if they are an HR Manager or Admin.
    Used for evaluations — an interviewer can only edit their own.
    """
    message = 'Access denied. You can only modify your own records.'

    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False

        # HR Managers and Admins can access everything
        if request.user.role and request.user.role.title in ['HR_MANAGER', 'ADMIN']:
            return True

        # Check if the object belongs to the requesting user
        # Works for models that have a created_by, evaluator, or sender field
        owner_fields = ['created_by', 'evaluator', 'sender', 'changed_by']
        for field in owner_fields:
            if hasattr(obj, field):
                return getattr(obj, field) == request.user

        return False


class IsInterviewParticipantOrHRManager(BasePermission):
    """
    Grants access to submit an evaluation only if the user is a
    participant in the relevant interview, or is HR/Admin.

    This is checked via has_permission (not has_object_permission)
    because it's used specifically for EvaluationViewSet.create,
    where there's no Evaluation object yet — the interview is
    referenced by ID in the request body, not fetched via get_object().
    """
    message = 'Access denied. You must be a participant in this interview to submit an evaluation.'

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.role and request.user.role.title in ['HR_MANAGER', 'ADMIN']:
            return True

        interview_id = request.data.get('interview')
        if not interview_id:
            return True  # let serializer validation produce the proper missing-field error

        from apps.interviews.models import Interview
        return Interview.objects.filter(id=interview_id, participants=request.user).exists()
