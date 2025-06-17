from rest_framework.generics import RetrieveAPIView, get_object_or_404

from apps.apk.models import APK
from .serializers import APKSerializer


class APKView(RetrieveAPIView):
    serializer_class = APKSerializer
    queryset = APK.objects.all()

    def get_object(self):
        return get_object_or_404(self.get_queryset(), active=True)
