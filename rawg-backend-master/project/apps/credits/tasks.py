from django.utils.timezone import now

from apps.celery import app as celery
from apps.credits.models import Person
from apps.credits.seo import generate_auto_description_en, generate_auto_description_ru
from apps.utils.celery import lock

person_lock_id = 'apps.credits.tasks:persons:{}'


@celery.task(
    time_limit=90, bind=True, ignore_result=True, max_retries=20, default_retry_delay=3,
    acks_late=True, reject_on_worker_lost=True
)
def update_person(self, person_id, targets=None):
    with lock(person_lock_id.format(person_id), self.app.oid) as acquired:
        if not acquired:
            self.retry()
        try:
            person = Person.objects.get(id=person_id)
        except Person.DoesNotExist:
            return
        if person.hidden:
            return
        if person.gender == Person.GENDER_UNKNOWN:
            person.detect_gender()
        if not person.display_name_ru:
            person.write_foreign_names()
        person.set_statistics(targets)
        auto_description_en = generate_auto_description_en(person)
        auto_description_ru = generate_auto_description_ru(person)
        if (
            (auto_description_en or auto_description_ru)
            and (
                person.auto_description_en != auto_description_en or person.auto_description_ru != auto_description_ru
            )
        ):
            Person.objects.filter(id=person_id).update(
                auto_description=auto_description_en,
                auto_description_en=auto_description_en,
                auto_description_ru=auto_description_ru,
                updated=now()
            )
