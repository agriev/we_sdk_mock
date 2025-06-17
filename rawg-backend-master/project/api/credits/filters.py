from api.credits.serializers import PersonSearchSerializer
from apps.credits import models
from apps.utils.haystack import SearchBackend


class PersonSearchBackend(SearchBackend):
    serializer_class = PersonSearchSerializer
    model = models.Person
