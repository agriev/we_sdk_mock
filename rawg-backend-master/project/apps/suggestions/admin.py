from django.contrib import admin

from apps.suggestions import forms, models
from apps.utils.admin import ClearCacheMixin, CompareVersionAdmin
from apps.utils.adminsortable2 import SortableAdminMixin


class SuggestionFiltersInline(admin.StackedInline):
    model = models.SuggestionFilters
    form = forms.SuggestionFiltersAdminForm
    extra = 0


@admin.register(models.Suggestion)
class SuggestionAdmin(ClearCacheMixin, SortableAdminMixin, CompareVersionAdmin):
    list_display = ('name', 'description', 'limit')
    form = forms.SuggestionAdminForm
    inlines = (SuggestionFiltersInline,)
