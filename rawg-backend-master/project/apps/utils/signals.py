from django.db import transaction
from django.dispatch import receiver
from reversion.signals import post_revision_commit

from apps.utils.tasks import clear_versions


@receiver(post_revision_commit)
def post_revision_commit_receiver(sender, revision, versions, **kwargs):
    transaction.on_commit(lambda: clear_versions.delay(revision.id, [v.id for v in versions]))
