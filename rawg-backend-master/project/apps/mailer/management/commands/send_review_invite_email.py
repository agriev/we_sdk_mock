from hashlib import sha1

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Case, Count, When
from django.utils import translation
from django.utils.timezone import now, timedelta
from tqdm import tqdm

from apps.games.models import Game
from apps.mailer.models import Mail
from apps.reviews.models import Review
from apps.users.models import UserGame
from apps.utils.dates import monday
from apps.utils.dicts import merge
from apps.utils.emails import send
from apps.utils.exceptions import capture_exception

MAX_GAMES = 4


class Command(BaseCommand):
    help = 'Send emails to users with review invitations'
    week = monday(now())
    first_day = week - timedelta(days=3)
    last_day = week + timedelta(days=4)

    def add_arguments(self, parser):
        parser.add_argument('-g', '--game-slug', dest='game_slug', nargs='+', type=str)
        parser.add_argument('-e', '--email', action='store', dest='email', default='', type=str)
        parser.add_argument('-d', '--debug', action='store_true', dest='debug', default=False)

    def handle(self, *args, **options):
        game_slug_list = options.get('game_slug')
        email = options.get('email')
        debug = options.get('debug')

        if debug and email:
            self.process_emails(debug=debug, to_email=email)
        elif game_slug_list and email:
            games = Game.objects.filter(slug__in=game_slug_list).values_list('id', flat=True)
            user = get_user_model().objects.get(email=email)
            send_review_invite_email(user=user, games=games)
        else:
            self.process_emails()
        self.stdout.write(self.style.SUCCESS('OK'))

    def process_emails(self, debug=False, to_email=None):
        for user_id, games in tqdm(self.check_last_played(), total=self.get_count()):
            if not games:
                continue
            try:
                user = get_user_model().objects.get(id=user_id)
            except get_user_model().DoesNotExist:
                continue
            if not user.real_email or not user.subscribe_mail_reviews_invite:
                continue
            with translation.override(user.source_language):
                send_review_invite_email(
                    user=user,
                    games=games,
                    debug=debug,
                    to_email=to_email
                )
        self.stdout.write(self.style.SUCCESS('OK'))

    def check_last_played(self):
        users_and_games = {}
        for user_game in self.get_qs():
            users_and_games.setdefault(user_game.user_id, []).append(user_game.game_id)
        for user_id, games in users_and_games.items():
            user_reviews = list(Review.objects.filter(user_id=user_id).values_list('game_id', flat=True))
            yield user_id, [game for game in games if game not in user_reviews][:MAX_GAMES]

    def get_qs(self):
        return UserGame.objects.filter(
            last_played__gte=self.first_day,
            last_played__lt=self.last_day
        ).exclude(
            status__in=(UserGame.STATUS_TOPLAY, UserGame.STATUS_YET)
        ).order_by('-last_played')

    def get_count(self):
        return self.get_qs().values('user').annotate(count=Count('id')).order_by('-count').count()


def send_review_invite_email(user, games, debug=False, to_email=None, update_context=None):
    mail_slug = 'review-invite'
    language = user.source_language or settings.MODELTRANSLATION_DEFAULT_LANGUAGE
    games = Game.objects.defer_all().filter(id__in=games).order_by(
        Case(*[When(id=pk, then=pos) for pos, pk in enumerate(games)])
    )
    email = user.email
    if debug and to_email:
        email = to_email
    username = user.username
    if user.first_name and user.last_name:
        username = f'{user.first_name} {user.last_name}'
    elif user.first_name:
        username = user.first_name

    game_main_context = None
    games_context = []
    for game in games:
        game_image = ''
        if game.background_image_full:
            game_image = game.background_image_full
            if hasattr(game_image, 'url'):
                game_image = game_image.url
            if game_main_context:
                game_image = game_image.replace('/media/', '/media/resize/600/-/')
        context = {
            'name': game.name,
            'image': game_image,
            'platforms': [
                {'name': item['name'], 'slug': item['slug']}
                for item in game.parent_platforms_json or []
            ]
        }
        if not game_main_context:
            game_main_context = context
        else:
            games_context.append(context)

    context = {
        'mail_slug': mail_slug,
        'user': {
            'username': username,
            'avatar': (user.avatar or '').replace('/media/', '/media/resize/200/-/'),
            'id': user.id,
            'security_hash': sha1('{}.{}'.format(user.email, settings.SECRET_KEY).encode('utf-8')).hexdigest(),
            'email': user.email,
        },
        'game_main': game_main_context,
        'games': games_context or [],
        'subject_game_name': games.first().name,
        'subject_games_count': len(games),
        'block_divider': True,
        'block_orange_header': True,
        'block_rate': True,
        'utm': '?from=weekly_email&utm_source=Review_carousel&utm_medium=email&utm_campaign=weekly',
    }
    if update_context:
        merge(update_context, context)

    with transaction.atomic():
        try:
            if not debug:
                mail_obj = Mail.objects.filter(user=user, user_email=user.email, mail_slug=mail_slug).first()
                if mail_obj and (mail_obj.sent_at > (now() - timedelta(hours=48))):
                    return
            msg = send(f'mailer/email_{language}/{mail_slug}', context, (email,), language=language)
            mail = Mail.objects.create(user=user, user_email=user.email, mail_slug=mail_slug, subject=msg.subject)
            mail.source.save('temp_mail', content=ContentFile(msg.message().as_bytes()), save=True)
        except Exception as e:
            capture_exception(e)
