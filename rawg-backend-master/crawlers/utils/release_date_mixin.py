import calendar
from datetime import date

from dateutil.parser import parse


class ReleaseDateMixin:
    last_month_mapping = {
        'Fall': 11,
        'Summer': 8,
        'Winter': 2,
        'Spring': 5,
        'Q1': 3,
        'Q2': 6,
        'Q3': 9,
        'Q4': 12,
        '1st': 3,
        '2nd': 6,
        '3rd': 9,
        '4th': 12,

    }
    tbd_release_date = 'tbd'

    def get_season_last_month_number(self, season):
        default_month_number = 12
        return self.last_month_mapping.get(season, default_month_number)

    def get_month_last_day(self, month_number, year):
        return calendar.monthrange(int(year), month_number)[1]

    def get_release_date_by_season_and_year(self, season, year):
        month_number = self.get_season_last_month_number(season)
        month_last_day = self.get_month_last_day(month_number, year)
        release_date = date(int(year), month_number, month_last_day).isoformat()
        return release_date

    def get_season_and_year_from_raw_release_date(self, raw_release_date):
        season = year = None
        date_items = raw_release_date.split()
        for date_item in date_items:
            if date_item in self.last_month_mapping.keys():
                season = date_item
            year = date_items[-1]
        return season, year

    def _get_release_date(self, raw_release_date):
        season, year = self.get_season_and_year_from_raw_release_date(raw_release_date)
        if not season or not year:
            return self.tbd_release_date

        release_date = self.get_release_date_by_season_and_year(season, year)
        return release_date

    def get_release_date(self, raw_release_date):
        try:
            release_date = parse(raw_release_date).isoformat()
        except ValueError:
            release_date = self._get_release_date(raw_release_date)
        return release_date
