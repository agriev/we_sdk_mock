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
from apps.mailer.models import Mail, ViewedRecommendation
from apps.recommendations.models import UserRecommendation
from apps.utils.dicts import merge
from apps.utils.emails import send
from apps.utils.exceptions import capture_exception

MIN_RECOMMENDATIONS = 3
MAX_RECOMMENDATIONS = 10


class Command(BaseCommand):
    help = 'Send emails to users with recommendations'

    def add_arguments(self, parser):
        parser.add_argument('-g', '--game-slug', dest='game_slug', nargs='+', type=str)
        parser.add_argument('-e', '--email', action='store', dest='email', default='', type=str)
        parser.add_argument('-d', '--debug', action='store_true', dest='debug', default=False)

    def handle(self, *args, **options):
        game_slug_list = options.get('game_slug')
        email = options.get('email')
        debug = options.get('debug')

        if debug and email:
            user = get_user_model().objects.get(email=email)
            if game_slug_list:
                games = Game.objects.filter(slug__in=game_slug_list).values_list('id', flat=True)
                send_recommendations_email(user, games, [], debug=debug, to_email=email)
            else:
                for _, games, not_viewed_games in tqdm(
                    self.check_new_recommendations(user.id), total=self.get_count(user.id)
                ):
                    if not games:
                        continue
                    send_recommendations_email(user, games, not_viewed_games, debug=debug, to_email=email)
        else:
            self.process_emails()
        self.stdout.write(self.style.SUCCESS('OK'))

    def process_emails(self, debug=False, to_email=None):
        for user_id, games, not_viewed_games in tqdm(self.check_new_recommendations(), total=self.get_count()):
            if not games:
                continue
            try:
                user = get_user_model().objects.get(id=user_id)
            except get_user_model().DoesNotExist:
                continue
            if not user.real_email or not user.subscribe_mail_recommendations:
                continue
            with translation.override(user.source_language):
                send_recommendations_email(user, games, not_viewed_games, debug=debug, to_email=to_email)

    def check_new_recommendations(self, user_id=None):
        prev_user_id = None
        data = []
        for user_recommendation in self.get_qs(user_id).only('user_id', 'game_id', 'sources').iterator():
            if prev_user_id and prev_user_id != user_recommendation.user_id:
                yield self.user_output(prev_user_id, data)
                data = []
            data.append((user_recommendation.game_id, user_recommendation.sources))
            prev_user_id = user_recommendation.user_id
        if data:
            yield self.user_output(prev_user_id, data)

    def user_output(self, user_id, data):
        viewed_games = list(
            ViewedRecommendation.objects.filter(user_id=user_id).values_list('game_id', flat=True)
        )
        data = [(game_id, sources) for game_id, sources in data if game_id not in viewed_games]
        not_viewed_games = [game_id for game_id, _ in data]
        collaborative_count = 0
        for _, sources in data:
            if UserRecommendation.SOURCES_COLLABORATIVE in sources:
                collaborative_count += 1
        if collaborative_count < MIN_RECOMMENDATIONS:
            data = []
        return user_id, [game_id for game_id, _ in data][:MAX_RECOMMENDATIONS], not_viewed_games

    def get_qs(self, user_id=None):
        qs = UserRecommendation.objects.visible().filter(sources__overlap=[
            UserRecommendation.SOURCES_COLLABORATIVE, UserRecommendation.SOURCES_TRENDING
        ]).order_by('user_id', 'position')
        if user_id:
            qs = qs.filter(user_id=user_id)
        return qs

    def get_count(self, user_id=None):
        return self.get_qs(user_id).values('user').annotate(count=Count('id')).order_by('-count').count()


def send_recommendations_email(user, games, not_viewed_games, debug=False, to_email=None, update_context=None):
    mail_slug = 'recommendations'
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

    games_context = []
    for game in games:
        game_image = ''
        if game.background_image_full:
            game_image = game.background_image_full
            if hasattr(game_image, 'url'):
                game_image = game_image.url
            game_image = game_image.replace('/media/', '/media/crop/600/400/')
        games_context.append({
            'name': game.name,
            'slug': game.slug,
            'image': game_image,
            'released': game.released,
            'tba': game.tba,
            'platforms': [
                {'name': item['name'], 'slug': item['slug']}
                for item in game.parent_platforms_json or []
            ],
            'genres': (
                list(game.genres.values_list('name', flat=True))
                + list(
                    game.tags.visible().filter(language=language)
                    .order_by('-games_count').values_list('name', flat=True)
                )
            )[:5]
        })

    context = {
        'mail_slug': mail_slug,
        'year': now().year,
        'user': {
            'username': username,
            'slug': user.slug,
            'avatar': (user.avatar or '').replace('/media/', '/media/resize/200/-/'),
            'id': user.id,
            'security_hash': sha1('{}.{}'.format(user.email, settings.SECRET_KEY).encode('utf-8')).hexdigest(),
            'email': user.email,
        },
        'games': games_context or [],
        'block_button': True,
        'block_games': True,
        'block_post_body': True,
        'utm': '?from=weekly_email&utm_source=Recommendations&utm_medium=email&utm_campaign=weekly',
    }
    if update_context:
        merge(update_context, context)

    viewed_games = []
    now_date = now()
    for game_id in not_viewed_games:
        viewed_recommendation = ViewedRecommendation()
        viewed_recommendation.game_id = game_id
        viewed_recommendation.user_id = user.id
        viewed_recommendation.created = now_date
        viewed_games.append(viewed_recommendation)

    with transaction.atomic():
        try:
            if not debug:
                mail_obj = Mail.objects.filter(user=user, user_email=user.email, mail_slug=mail_slug).first()
                if mail_obj and (mail_obj.sent_at > (now() - timedelta(hours=48))):
                    return
            msg = send(f'mailer/email_{language}/{mail_slug}', context, (email,), language=language)
            mail = Mail.objects.create(user=user, user_email=user.email, mail_slug=mail_slug, subject=msg.subject)
            mail.source.save('temp_mail', content=ContentFile(msg.message().as_bytes()), save=True)
            ViewedRecommendation.objects.bulk_create(viewed_games)
        except Exception as e:
            capture_exception(e)
