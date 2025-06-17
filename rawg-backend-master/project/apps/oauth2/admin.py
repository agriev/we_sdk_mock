from django.contrib import admin

from .forms import ChangeClientAdminForm, CreateClientAdminForm
from .models import Client


@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = ('id', 'game')
    search_fields = ('game__name',)
    ordering = ('-id',)

    change_form = ChangeClientAdminForm
    create_form = CreateClientAdminForm

    _create_fields_main = ['game', 'name', 'redirect_uris', 'client_secret_expires_at']
    _change_fields_main = _create_fields_main + ['client_secret', 'client_id', 'client_id_issued_at']
    _create_fields_pic = ['upload_pic']
    _change_fields_pic = _create_fields_pic + ['pic', 'clear_pic']

    def get_form(self, request, obj=None, change=False, **kwargs):
        if obj:
            return self.change_form
        return self.create_form

    def save_model(self, request, obj, form, change):
        form.save()

    def get_actions(self, request):
        actions = super().get_actions(request)
        if 'delete_selected' in actions:
            del actions['delete_selected']
        return actions

    def get_fieldsets(self, request, obj=None):
        if obj is None:
            fields_main = self._create_fields_main
            fields_pic = self._create_fields_pic
        else:
            fields_main = self._change_fields_main
            fields_pic = self._change_fields_pic
        return [('Main', {'fields': fields_main}), ('Pic', {'fields': fields_pic})]
