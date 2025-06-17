from collections import OrderedDict

from django.db.models import Manager
from rest_framework import serializers

from apps.ad.models import AdFoxCompanyParameter


class AggregateListByObjNameSerializer(serializers.ListSerializer):
    def to_representation(self, data):
        iterable = data.all() if isinstance(data, Manager) else data
        list_representation = OrderedDict()
        for item in iterable:
            list_representation.setdefault(item.company, []).append(self.child.to_representation(item))
        return [{k: v} for k, v in list_representation.items()]


class AdFoxCompanyParameterSerializer(serializers.ModelSerializer):
    class Meta:
        model = AdFoxCompanyParameter
        list_serializer_class = AggregateListByObjNameSerializer
        fields = ('name', 'value')
