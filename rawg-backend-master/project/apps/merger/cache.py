from apps.utils.cache import Job


class AvgDurations(Job):
    lifetime = 600
    is_warm = True

    def fetch(self):
        from apps.merger.models import ImportLog
        return ImportLog.avg_durations()
