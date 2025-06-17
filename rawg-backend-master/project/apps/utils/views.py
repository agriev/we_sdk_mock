from django.contrib.auth.mixins import AccessMixin
from django.urls import reverse


class StaffRequiredMixin(AccessMixin):
    def get_login_url(self):
        return reverse('admin:index')

    def dispatch(self, request, *args, **kwargs):
        if not request.user.is_staff or not request.user.is_active:
            return self.handle_no_permission()
        return super().dispatch(request, *args, **kwargs)
