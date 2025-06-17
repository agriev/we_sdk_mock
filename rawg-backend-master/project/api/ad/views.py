from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticatedOrReadOnly

from apps.ad.models import AdFoxCompanyParameter
from .serializers import AdFoxCompanyParameterSerializer


class AdFoxCompanyParameterView(ListAPIView):
    serializer_class = AdFoxCompanyParameterSerializer
    permission_classes = (IsAuthenticatedOrReadOnly,)

    def get_queryset(self):
        try:
            game_id = int(self.request.query_params['game_id'])
        except (ValueError, KeyError):
            return AdFoxCompanyParameter.objects.none()
        return AdFoxCompanyParameter.objects.filter(game_id=game_id)
