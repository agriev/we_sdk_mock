from django.contrib import admin

from .models import APK


@admin.register(APK)
class APKAdmin(admin.ModelAdmin):
    list_display = ['version', 'active', 'created']
    list_display_links = ['version']
    list_filter = ['active', 'created']

    def save_model(self, request, obj, form, change):
        if obj.active:
            self.model.objects.filter(active=True).update(active=False)
        return super().save_model(request, obj, form, change)
