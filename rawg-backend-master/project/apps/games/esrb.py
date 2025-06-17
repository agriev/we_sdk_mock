import re

from django.db.models import Q

from apps.games.models import ESRBRating


class ESRBConverter(object):

    def _get_esrb_rating_mapping(self, require_age):
        """
        Using for overriding require age to esrb system rating

        Based on https://www.esrb.org/ratings/ratings_guide.aspx
        """
        esbr_rating_value = 'AO'
        esrb_rating_mapping = {
            0: 'E',
            10: 'E10+',
            13: 'T',
            17: 'M',
        }

        for age, esbr_value in esrb_rating_mapping.items():
            if require_age <= age:
                return esbr_value
        return esbr_rating_value

    def _retrieve_age_from_str(self, required_age):
        ages = re.findall(r'\d+', required_age)
        if not ages:
            return
        return self._get_esrb_rating_mapping(max(map(int, ages)))

    def _check_in_esrb_model(self, required_age):
        for word in required_age.split():
            queryset = ESRBRating.objects.filter(Q(name__iexact=word) | Q(short_name=word))
            if queryset:
                return queryset[0].short_name

    def convert(self, required_age):
        checkers = (
            self._retrieve_age_from_str,
            self._check_in_esrb_model,
        )

        for check in checkers:
            result = check(required_age)
            if result:
                return result
