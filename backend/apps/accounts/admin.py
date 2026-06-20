from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, Role, Department


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ['id', 'name']
    search_fields = ['name']


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ['id', 'title']
    search_fields = ['title']


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['id', 'email', 'first_name', 'last_name', 'role', 'department', 'is_active', 'is_staff']
    list_filter = ['role', 'department', 'is_active', 'is_staff']
    search_fields = ['email', 'first_name', 'last_name']
    ordering = ['last_name', 'first_name']

    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal Info', {'fields': ('first_name', 'last_name')}),
        ('Organisation', {'fields': ('role', 'department')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Important Dates', {'fields': ('date_joined', 'last_login')}),
    )

    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'first_name', 'last_name', 'role', 'department', 'password1', 'password2'),
        }),
    )

    readonly_fields = ['date_joined', 'last_login']
