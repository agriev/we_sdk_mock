import functools
import os
from collections import OrderedDict
from datetime import datetime

from corsheaders.defaults import default_headers
from django.utils.translation import gettext_lazy as _
from papi import API_VERSION

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SECRET_KEY = 'ctt^xw3i-6*us_89w(-kl&$xk8yosp+#e3k-fyev9x$%(mndwy'
ENVIRONMENT = os.environ.get('ENVIRONMENT', 'DOCKER')
TESTS_ENVIRONMENT = os.environ.get('TESTS_ENVIRONMENT', 'DOCKER')
DEBUG = ENVIRONMENT == 'DOCKER'
ALLOWED_HOSTS = [
    'api.ag.ru', 'ag.ru', 'devapi.ag.ru', 'dev.ag.ru', 'web', 'web-temp', 'help', 'localhost',
]
ROOT_URLCONF = 'urls'
WSGI_APPLICATION = 'wsgi.application'
SITE_ALIASES = {
    'ag.ru': 'api.ag.ru',
}
if DEBUG:
    SITE_ALIASES['localhost'] = 'devapi.ag.ru'
SITE_PROTOCOL = 'https' if ENVIRONMENT != 'DOCKER' else 'http'

INSTALLED_APPS = [
    'admin_auto_filters',
    'adminsortable2',
    'allauth',
    'allauth.account',
    'allauth.socialaccount',
    'allauth.socialaccount.providers.facebook',
    'allauth.socialaccount.providers.openid',
    'allauth.socialaccount.providers.twitter',
    'allauth.socialaccount.providers.vk',
    'celery_haystack',
    'corsheaders',
    'constance',
    'constance.backends.database',
    'crispy_forms',
    'django_filters',
    'drf_yasg',
    'haystack',
    'haystackbrowser',
    'knbauth',
    'modeltranslation',
    'ordered_model',
    'rangefilter',
    'rest_auth',
    'rest_auth.registration',
    'rest_framework',
    'rest_framework.authtoken',
    'rest_framework_swagger',
    'reversion',
    'reversion_compare',
    'select2',
    'static_sitemaps',
    'storages',

    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.messages',
    'django.contrib.sessions',
    'django.contrib.sitemaps',
    'django.contrib.sites',
    'django.contrib.staticfiles',

    'apps',
    'apps.ad',
    'apps.achievements',
    'apps.apk',
    'apps.banners',
    'apps.charts',
    'apps.comments',
    'apps.common',
    'apps.credits',
    'apps.discussions',
    'apps.external',
    'apps.feed',
    'apps.feedback',
    'apps.files',
    'apps.games',
    'apps.images',
    'apps.mailer',
    'apps.merger',
    'apps.oauth2',
    'apps.payments',
    'apps.pusher',
    'apps.recommendations',
    'apps.reviews',
    'apps.shop',
    'apps.stat',
    'apps.stories',
    'apps.stripe',
    'apps.suggestions',
    'apps.tests',
    'apps.token',
    'apps.users',
    'apps.utils',
]
if ENVIRONMENT != 'PRODUCTION':
    INSTALLED_APPS += ['apps.mocks']

SILENCED_SYSTEM_CHECKS = [
    'admin.E408'
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'apps.utils.middlewares.ForceCsrfCookieMiddleware',
    'apps.utils.middlewares.ApiKeyMiddleware',
    'apps.utils.middlewares.LocaleMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    # 'django.middleware.csrf.CsrfViewMiddleware',
    # 'django.contrib.auth.middleware.AuthenticationMiddleware',
    'apps.utils.middlewares.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'apps.utils.middlewares.ApiClientMiddleware',
    'apps.utils.middlewares.AddPathHeaderMiddleware',
    'apps.utils.middlewares.XAccelExpiresHeaderMiddleware',
    'apps.common.middlewares.ModelAdminReorderMiddleware',
]

SESSION_ENGINE = 'django.contrib.sessions.backends.cache'

ADMIN_REORDER = [
    'achievements',
    'ad',
    'apk',
    'banners',
    'comments',
    'common',
    'constance',
    'credits',
    'discussions',
    'external',
    'feed',
    'feedback',
    'games',
    'images',
    'mailer',
    'merger',
    'oauth2',
    'payments',
    'reversion',
    'reviews',
    {
        'app': 'socialaccount',
        'label': 'Social accounts',
        'models': (
            'socialaccount.SocialAccount',
            'socialaccount.SocialToken',
            'socialaccount.SocialApp',
        )
    },
    {
        'app': 'stat',
        'models': (
            'stat.APIByUserVisit',
            'stat.APIByUserAgentVisit',
            'stat.APIByIPVisit',
            'stat.APIByIPAndUserAgentVisit',
            'stat.APIUserCounter',
            'stat.Story',
            'stat.CarouselRating',
            'stat.Status',
            'stat.Visit',
            'stat.RecommendationsVisit',
            'stat.RecommendedGameVisit',
            'stat.RecommendedGameStoreVisit',
            'stat.RecommendedGameAdding',
            {'admin_url': 'stat:users_activity', 'label': 'Analytics'},
        )
    },
    'stories',
    'suggestions',
    {
        'app': 'users',
        'label': 'Users',
        'models': (
            'users.User',
            'users.UserGame',
            'users.UserFollowElement',
            'users.UserFavoriteGame',
            'users.UserReferer',
            'users.Subscription',
            'users.SubscriptionProgram',
            'account.EmailAddress',
            'auth.Group',
            'authtoken.Token',
        )
    },
    'stripe',
    'sites',
    'recommendations',
    'pusher',
    'haystackbrowser',
    'files',
    'mocks',
    # 'token',
    # 'shop',
]

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [
            os.path.join(BASE_DIR, 'project', 'templates'),
        ],
        'OPTIONS': {
            'debug': DEBUG,
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
            'loaders': [
                (
                    'django.template.loaders.cached.Loader', [
                        'django.template.loaders.filesystem.Loader',
                        'django.template.loaders.app_directories.Loader',
                    ],
                ),
            ],
        },
    },
]

############
# Database #
############

CONN_MAX_AGE = os.environ.get('CONN_MAX_AGE')
if CONN_MAX_AGE:
    CONN_MAX_AGE = int(CONN_MAX_AGE)
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('POSTGRES_NAME') or os.environ.get('POSTGRES_USER'),
        'USER': os.environ.get('POSTGRES_USER'),
        'PASSWORD': os.environ.get('POSTGRES_PASSWORD'),
        'HOST': os.environ.get('POSTGRES_HOST', 'postgres'),
        'PORT': os.environ.get('POSTGRES_PORT', '5432'),
        'CONN_MAX_AGE': CONN_MAX_AGE,
    },
}

#########
# Cache #
#########

MEMCACHED_LOCATION = os.environ.get('DJANGO_CACHE_LOCATION', 'memcached:11211')
CACHES = {
    'default': {
        'BACKEND': os.environ.get('DJANGO_CACHE_BACKEND', 'django.core.cache.backends.memcached.PyLibMCCache'),
        'LOCATION': MEMCACHED_LOCATION,
    },
}
CACHEBACK_VERIFY_CACHE_WRITE = os.environ.get('CACHEBACK_VERIFY_CACHE_WRITE', False)
USE_ETAGS = False

#########
# Redis #
#########

REDIS_LOCATION = os.environ.get('REDIS_LOCATION', 'redis://redis:6379/1')
if ENVIRONMENT == 'TESTS':
    REDIS_LOCATION = os.environ.get('TEST_REDIS_LOCATION', 'redis://redis:6379/10')

###########
# Logging #
###########

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'filters': {
        'require_debug_false': {
            '()': 'django.utils.log.RequireDebugFalse',
        },
    },
    'formatters': {
        'verbose': {
            'format': '[%(asctime)s] %(levelname)s [%(name)s:%(lineno)s] %(message)s',
            'datefmt': '%d/%b/%Y %H:%M:%S',
        },
        'verbose_with_modulename':{
            'format': '[%(asctime)s] %(levelname)s [%(name)s:%(lineno)s] [%(filename)s] %(message)s',
            'datefmt': '%d/%b/%Y %H:%M:%S',
        },
        'simple': {
            'format': '%(levelname)s %(message)s',
        },
    },
    'handlers': {
        'file': {
            'level': 'WARNING',
            'class': 'apps.utils.log.MakeFileHandler',
            'filename': os.path.join(BASE_DIR, 'logs', 'errors.log'),
            'formatter': 'verbose',
        },
        'file_commands': {
            'level': 'INFO',
            'class': 'apps.utils.log.MakeFileHandler',
            'filename': os.path.join(BASE_DIR, 'logs', 'commands.log'),
            'formatter': 'verbose_with_modulename',
        },
        'file_info': {
            'level': 'INFO',
            'class': 'apps.utils.log.MakeFileHandler',
            'filename': os.path.join(BASE_DIR, 'logs', 'info.log'),
            'formatter': 'verbose',
        },
        'file_social': {
            'level': 'INFO',
            'class': 'apps.utils.log.MakeFileHandler',
            'filename': os.path.join(BASE_DIR, 'logs', 'social.log'),
            'formatter': 'verbose',
        },
        'file_psn': {
            'level': 'INFO',
            'class': 'apps.utils.log.MakeFileHandler',
            'filename': os.path.join(BASE_DIR, 'logs', 'psn.log'),
            'formatter': 'verbose',
        },
        'file_haystack': {
            'level': 'INFO',
            'class': 'apps.utils.log.MakeFileHandler',
            'filename': os.path.join(BASE_DIR, 'logs', 'haystack.log'),
            'formatter': 'verbose',
        },
        'file_celery_retried': {
            'level': 'INFO',
            'class': 'apps.utils.log.MakeFileHandler',
            'filename': os.path.join(BASE_DIR, 'logs', 'celery_retried.log'),
            'formatter': 'verbose',
        },
        'file_celery_failed': {
            'level': 'INFO',
            'class': 'apps.utils.log.MakeFileHandler',
            'filename': os.path.join(BASE_DIR, 'logs', 'celery_failed.log'),
            'formatter': 'verbose',
        },
        'file_xsolla': {
            'level': 'INFO',
            'class': 'apps.utils.log.MakeFileHandler',
            'filename': os.path.join(BASE_DIR, 'logs', 'xsolla.log'),
            'formatter': 'verbose_with_modulename',
        },
        'file_payment': {
            'level': 'INFO',
            'class': 'apps.utils.log.MakeFileHandler',
            'filename': os.path.join(BASE_DIR, 'logs', 'payment.log'),
            'formatter': 'verbose_with_modulename'
        },
        'console': {
            'level': 'DEBUG',
            'class': 'logging.StreamHandler',
            'formatter': 'simple',
        },
    },
    'loggers': {
        '': {
            'handlers': ['file', 'console'],
            'level': 'WARNING',
        },
        'django': {
            'handlers': ['file', 'console'],
            'propagate': False,
            'level': 'WARNING',
        },
        'django.request': {
            'handlers': ['file', 'console'],
            'propagate': False,
            'level': 'ERROR',  # filter 404 warnings
        },
        'django.server': {
            'handlers': ['console'],
            'propagate': False,
            'level': 'DEBUG',
        },
        'commands': {
            'handlers': ['file_commands', 'console'],
            'propagate': False,
            'level': 'INFO',
        },
        'elasticsearch': {
            'handlers': ['console'],
            'propagate': True,
            'level': 'ERROR',
        },
        'info': {
            'handlers': ['file_info', 'console'],
            'propagate': False,
            'level': 'INFO',
        },
        'social': {
            'handlers': ['file_social'],
            'propagate': False,
            'level': 'INFO',
        },
        'psn': {
            'handlers': ['file_psn'],
            'propagate': False,
            'level': 'INFO',
        },
        'haystack': {
            'handlers': ['file_haystack'],
            'propagate': False,
            'level': 'INFO',
        },
        'celery_retried': {
            'handlers': ['file_celery_retried'],
            'propagate': False,
            'level': 'INFO',
        },
        'celery_failed': {
            'handlers': ['file_celery_failed'],
            'propagate': False,
            'level': 'INFO',
        },
        'xsolla': {
            'handlers': ['file_xsolla', 'console'],
            'propagate': False,
            'level': 'INFO',
        },
        'payment': {
            'handlers': ['file_payment', 'console'],
            'propagate': False,
            'level': 'INFO',
        },
        'redis': {
            'handlers': ['console'],
            'propogate': False,
            'level': 'INFO',
        }
    },
}

if os.environ.get('DEBUG_SQL') or os.environ.get('DEBUG_SQL_TRACEBACK'):
    LOGGING['loggers']['django.db.backends'] = {
        'level': 'DEBUG',
        'handlers': ['console'],
        'propagate': False,
    }

if os.environ.get('DEBUG_SQL_TRACEBACK'):
    import traceback
    import logging
    import django.db.backends.utils as bakutils

    logger = logging.getLogger('django.db.backends')
    cursor_debug_wrapper_orig = bakutils.CursorDebugWrapper

    def print_stack_in_project(sql):
        stack = traceback.extract_stack()
        for path, lineno, func, line in stack:
            if 'lib/python' in path or 'settings.py' in path:
                continue
            logger.debug(f'File "{path}", line {lineno}, in {func}')
            logger.debug(f' {line}')
        logger.debug(sql)
        logger.debug('\n')

    class CursorDebugWrapperLoud(cursor_debug_wrapper_orig):
        def execute(self, sql, params=None):
            try:
                return super().execute(sql, params)
            finally:
                sql = self.db.ops.last_executed_query(self.cursor, sql, params)
                print_stack_in_project(sql)

        def executemany(self, sql, param_list):
            try:
                return super().executemany(sql, param_list)
            finally:
                print_stack_in_project(sql)

    bakutils.CursorDebugWrapper = CursorDebugWrapperLoud

IS_SENTRY = False
if os.environ.get('SENTRY_DSN'):
    IS_SENTRY = True
    SENTRY_DSN = os.environ['SENTRY_DSN']
    import sentry_sdk
    import sentry_sdk.utils
    from sentry_sdk.integrations.django import DjangoIntegration
    sentry_sdk.utils.MAX_STRING_LENGTH = 1024
    sentry_sdk.init(dsn=SENTRY_DSN, integrations=[DjangoIntegration()], send_default_pii=True)

########################
# Internationalization #
########################

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_L10N = True
USE_TZ = True
FORMAT_MODULE_PATH = [
    'apps.utils.formats',
]
LOCALE_PATHS = [
    os.path.join(BASE_DIR, 'locale'),
]
LANGUAGE_EN = 'en'
LANGUAGE_RU = 'ru'
LANGUAGE_ENG = 'eng'
LANGUAGE_RUS = 'rus'
LANGUAGES = (
    (LANGUAGE_EN, _('English')),
    (LANGUAGE_RU, _('Russian')),
)
LANGUAGES_2_TO_3 = {
    LANGUAGE_EN: LANGUAGE_ENG,
    LANGUAGE_RU: LANGUAGE_RUS,
}
LANGUAGES_3_TO_2 = {v: k for k, v in LANGUAGES_2_TO_3.items()}
MODELTRANSLATION_DEFAULT_LANGUAGE = LANGUAGE_EN
MODELTRANSLATION_DEFAULT_LANGUAGE_ISO3 = LANGUAGES_2_TO_3[MODELTRANSLATION_DEFAULT_LANGUAGE]
MODELTRANSLATION_PREPOPULATE_LANGUAGE = LANGUAGE_EN
MODELTRANSLATION_AUTO_POPULATE = 'default'
MODELTRANSLATION_CUSTOM_FIELDS = ('JSONField',)

SITE_LANGUAGES = {
    LANGUAGE_EN: 1,
    LANGUAGE_RU: 2,
}
SITE_ID_LANGUAGES = {pk: lang for lang, pk in SITE_LANGUAGES.items()}

SET_LANGUAGE_BY_HOST = os.environ.get('SET_LANGUAGE_BY_HOST')

#########
# Email #
#########

EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = os.environ.get('EMAIL_HOST')
EMAIL_PORT = os.environ.get('EMAIL_PORT')
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD')
EMAIL_USE_SSL = False
DEFAULT_FROM_EMAIL = 'AG <noreply@ag.ru>'
DEFAULT_FROM_EMAILS = {
    LANGUAGE_EN: DEFAULT_FROM_EMAIL,
    LANGUAGE_RU: DEFAULT_FROM_EMAIL,
}
SERVER_EMAIL = DEFAULT_FROM_EMAIL
ADMINS = (('Vitalii', 'fsow@yandex.ru'), ('Vitalii', 'mikhailov@kanobu.ru'))
FEEDBACK_EMAIL = 'feedback@kanobu.ru'

###################
# Debug and tests #
###################

if DEBUG:
    TEMPLATES[0]['OPTIONS']['loaders'] = (
        'django.template.loaders.filesystem.Loader',
        'django.template.loaders.app_directories.Loader',
    )

    from debug_toolbar.settings import PANELS_DEFAULTS
    DEBUG_TOOLBAR_PANELS = PANELS_DEFAULTS + [
        'haystack_panel.panel.HaystackDebugPanel',
        'stories.contrib.debug_toolbars.django.StoriesPanel',
    ]
    DEBUG_TOOLBAR_CONFIG = {
        'SHOW_TOOLBAR_CALLBACK': lambda request: not ('profile' in request.GET),
    }
    INSTALLED_APPS += [
        'debug_toolbar',
        'django_extensions',
        'haystack_panel',
        'stories.contrib.debug_toolbars.django',
    ]
    MIDDLEWARE += [
        'debug_toolbar.middleware.DebugToolbarMiddleware',
        'pyinstrument.middleware.ProfilerMiddleware',
    ]
    # PYINSTRUMENT_PROFILE_DIR = os.path.join(BASE_DIR, 'tmp', 'profiles')

if DEBUG or (ENVIRONMENT == 'TESTS' and TESTS_ENVIRONMENT != 'MAIL'):
    EMAIL_BACKEND = 'eml_email_backend.EmailBackend'
    EMAIL_FILE_PATH = os.path.join(BASE_DIR, 'tmp')

if ENVIRONMENT == 'TESTS':
    TEST_RUNNER = 'apps.utils.tests.TestRunner'

SHELL_PLUS = 'ipython'

######################
# Language detection #
######################

DETECT_LANGUAGE_API_KEY = '3ae48f948d72f4a1dc286c30697fc79d'
SAFE_LANGUAGES = ('ru', 'en', 'eo')
DEFAULT_LANGUAGE = 'eng'

################
# Static files #
################

STATICFILES_DIRS = (
    os.path.join(BASE_DIR, 'project', 'static'),
)
STATIC_ROOT = os.path.join(BASE_DIR, 'static')
STATIC_URL = '/static/'

MEDIA_ROOT = os.path.join(BASE_DIR, 'media')
MEDIA_URL_SITE = os.environ.get('MEDIA_URL', '')
if ENVIRONMENT == 'TESTS':
    MEDIA_URL_SITE = 'https://devmedia.ag.ru'
MEDIA_URL_FOLDER = '/media/'
MEDIA_URL = '{}{}'.format(MEDIA_URL_SITE, MEDIA_URL_FOLDER)

MEDIA_RESIZE = 'https://resize.ag.ru{}'.format(MEDIA_URL_FOLDER)

RESIZE_SIZES = (3840, 2560, 1920, 1280, 640, 600, 420, 234, 200, 80)
CROP_SIZES = ((48, 48), (72, 72), (96, 96), (144, 144), (150, 150), (192, 192), (600, 700), (600, 400))
PRE_RESIZE_BACKGROUND = (1920, 1280, 640, 600, 420, 234, 200)
PRE_CROP_BACKGROUND = ((600, 700), (600, 400))
PRE_RESIZE_SCREENS = (1920, 1280, 640, 420, 200)

DEFAULT_FILE_STORAGE = 'apps.utils.backend_storages.FileSystemStorage'
GAMES_FILES_STORAGE = DEFAULT_FILE_STORAGE
AWS_ACCESS_KEY_ID = os.environ.get('AWS_ACCESS_KEY_ID')
if AWS_ACCESS_KEY_ID:
    AWS_S3_ENDPOINT_URL = os.environ.get('AWS_S3_ENDPOINT_URL')
    AWS_S3_REGION_NAME = os.environ.get('AWS_S3_REGION_NAME')
    AWS_SECRET_ACCESS_KEY = os.environ.get('AWS_SECRET_ACCESS_KEY')
    AWS_STORAGE_BUCKET_NAME = os.environ.get('AWS_STORAGE_BUCKET_NAME')
    AWS_STORAGE_BUCKET_NAME_EMAILS = os.environ.get('AWS_STORAGE_BUCKET_NAME_EMAILS')
    AWS_S3_CUSTOM_DOMAIN = os.environ.get('AWS_S3_CUSTOM_DOMAIN')
    AWS_S3_OBJECT_PARAMETERS = {'CacheControl': 'max-age=31536000'}
    AWS_S3_FILE_OVERWRITE = False
    AWS_LOCATION = 'media'
    AWS_DEFAULT_ACL = 'private'
    DEFAULT_FILE_STORAGE = 'apps.utils.backend_storages.S3Boto3Storage'
    GAMES_FILES_STORAGE = 'apps.utils.backend_storages.GameFilesS3Boto3Storage'
GAMES_FILES_LOCATION = os.environ.get('GAMES_FILES_LOCATION')
XSENDFILE_NGINX_PREFIX = os.environ.get('XSENDFILE_NGINX_PREFIX', '')

if ENVIRONMENT == 'TESTS':
    MEDIA_ROOT = '/tmp/'

REPLACE_FILES_IN_DIRS = ('crop', 'resize', 'api')
SHOW_IMAGES_FROM_PRODUCTION = os.environ.get('SHOW_IMAGES_FROM_PRODUCTION', ENVIRONMENT == 'STAGE')

############
# Sitemaps #
############

STATICSITEMAPS_ROOT_SITEMAP = 'apps.common.sitemap.sitemaps'
STATICSITEMAPS_ROOT_DIR = os.path.join(
    STATIC_ROOT, 'sitemaps', os.environ.get('LANGUAGE', MODELTRANSLATION_DEFAULT_LANGUAGE)
)
STATICSITEMAPS_URLS = {
    LANGUAGE_RU: 'https://ag.ru/sitemaps/',
}
_language = os.environ.get('LANGUAGE', LANGUAGE_RU).split(':')[0]
STATICSITEMAPS_URL = STATICSITEMAPS_URLS[_language]
STATICSITEMAPS_MOCK_SITE = True
STATICSITEMAPS_MOCK_SITE_NAMES = {
    LANGUAGE_RU: 'ag.ru',
}
STATICSITEMAPS_MOCK_SITE_NAME = STATICSITEMAPS_MOCK_SITE_NAMES[_language]
STATICSITEMAPS_MOCK_SITE_PROTOCOL = 'https'
STATICSITEMAPS_REFRESH_AFTER = None
STATICSITEMAPS_PING_GOOGLE = False
STATICSITEMAPS_ALL_SITEMAPS = os.environ.get('STATICSITEMAPS_ALL_SITEMAPS', False)

########
# Auth #
########

_static_api_host = f'{os.environ.get("STATIC_API_HOST")}/{API_VERSION}'
AUTH_FAKE = os.environ.get('AUTH_FAKE', False)
if ENVIRONMENT == 'TESTS':
    AUTH_FAKE = os.environ.get('TEST_AUTH_FAKE', False)

AUTH_CONFIG = {
    'APP_ID': os.environ.get('AUTH_APP_ID', ''),
    'SECRET': os.environ.get('AUTH_SECRET', ''),
    'COOKIE_NAME': os.environ.get('AUTH_COOKIE_NAME', ''),
    'API_URL': os.environ.get('API_URL', ''),
    'AUTH_URL': os.environ.get('AUTH_URL', ''),
    'API_JS_URL': f'{_static_api_host}/js/api.js',
    'USE_CROSS_AUTH': True,
    'EXPORT_GSID_URL': f'{_static_api_host}/js/export_gsid.js'
}
PAPI_IMPORT_CONFIG = {
    'API_URL': os.environ.get('API_URL', ''),
    'APP_ID': os.environ.get('IMPORT_APP_ID', ''),
    'SECRET': os.environ.get('IMPORT_SECRET', ''),
}
PAPI_OAUTH2_CONFIG = {
    'API_URL': os.environ.get('API_URL', ''),
    'APP_ID': os.environ.get('OAUTH2_APP_ID', ''),
    'SECRET': os.environ.get('OAUTH2_SECRET', ''),
}

AUTH_USER_MODEL = 'users.User'
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'api.auth.validators.MinimumLengthValidator',
    },
    {
        'NAME': 'api.auth.validators.LeakedPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]
AUTHENTICATION_BACKENDS = (
    'allauth.account.auth_backends.AuthenticationBackend',
    'django.contrib.auth.backends.ModelBackend',
)

ACCOUNT_ADAPTER = 'apps.users.adapter.CustomAccountAdapter'
ACCOUNT_AUTHENTICATION_METHOD = 'email'
ACCOUNT_DEFAULT_HTTP_PROTOCOL = 'https'
ACCOUNT_EMAIL_REQUIRED = True
ACCOUNT_LOGOUT_ON_GET = False
ACCOUNT_UNIQUE_EMAIL = True
ACCOUNT_USERNAME_BLACKLIST = ('current',)

SESSION_COOKIE_NAME = 'dg'
SESSION_COOKIE_AGE = 5184000  # 60 days

SOCIALACCOUNT_ADAPTER = 'apps.users.adapter.CustomDefaultSocialAccountAdapter'
SOCIALACCOUNT_PROVIDERS = {
    'facebook': {
        'VERIFIED_EMAIL': True,
        'FIELDS': [
            'id',
            'email',
            'name',
            'first_name',
            'last_name',
            'verified',
            'locale',
            'timezone',
            'link',
            'gender',
            'updated_time',
            'picture.width(1000).height(1000)',
        ],
    },
    'twitter': {
        'VERIFIED_EMAIL': True,
    },
    'vk': {
        'VERIFIED_EMAIL': True,
    },
}
SOCIALACCOUNT_QUERY_EMAIL = True

REST_AUTH_SERIALIZERS = {
    'PASSWORD_RESET_SERIALIZER': 'api.auth.serializers.PasswordResetSerializer',
}

PWNED_PASSWORDS_API_URL = 'https://api.pwnedpasswords.com/range/{}'

##########
# Celery #
##########

RABBIT_URL = os.environ.get('DJANGO_RABBIT_LOCATION', 'rabbit:5672')
CELERY_BROKER_URL = os.environ.get('CELERY_BROKER_URL', f'amqp://guest:guest@{RABBIT_URL}/')
CELERY_RESULT_BACKEND = os.environ.get('CELERY_RESULT_BACKEND', f'cache+memcached://{MEMCACHED_LOCATION}/')
CELERY_TASK_EAGER_PROPAGATES = True

if ENVIRONMENT == 'TESTS':
    CELERY_TASK_ALWAYS_EAGER = True

##########
# Search #
##########


def games_more_like_this(instance):
    if not instance.tags.count():
        return {
            'fields': ['genres', 'description'],
            # 'max_query_terms': 25,
            # 'min_term_freq': 2,
            'min_doc_freq': 100,
            'max_doc_freq': 500,
            'min_word_length': 5,
            'max_word_length': 0,
            'analyzer': 'standard',
        }
    return {
        'fields': ['more_like_this'],
        'max_query_terms': 25,
        'min_term_freq': 1,
        'min_doc_freq': 10,
        'max_doc_freq': 300,
    }


MORE_LIKE_THIS = {
    'games.game': games_more_like_this,
}

HAYSTACK_CONNECTIONS = {
    'default': {
        'ENGINE': 'apps.utils.elastic.ElasticsearchSearchEngine',
        'URL': os.environ.get('ELASTICSEARCH_URL', 'http://elastic:9200'),
        'INDEX_NAME': os.environ.get('ELASTICSEARCH_INDEX', 'ag'),
        'BATCH_SIZE': 1000,
        'TIMEOUT': 10,
    },
}

HAYSTACK_FUZZINESS = 'AUTO:4,6'

ELASTIC_BULK = {
    'chunk_size': 500,
    'request_timeout': 10,
}

HAYSTACK_SIGNAL_PROCESSOR = 'haystack.signals.BaseSignalProcessor'
if ENVIRONMENT != 'TESTS':
    HAYSTACK_SIGNAL_PROCESSOR = 'celery_haystack.signals.CelerySignalProcessor'
CELERY_HAYSTACK_DEFAULT_TASK = 'apps.utils.tasks.HaystackSignalHandler'

HAYSTACK_LOG = os.environ.get('HAYSTACK_LOG')

########
# REST #
########

CORS_ALLOW_HEADERS = default_headers + (
    'token',
    'referer-trp',
    'referer-referer',
    'x-api-language',
    'x-api-client',
    'x-api-referer',
    'cache-control',
)

if ENVIRONMENT not in ['TESTS', 'DOCKER']:
    server_host = os.environ['SERVER_HOST']

    cosr_origin_whitelist_subdomains = ['madworld', 'mw', 'iframe.mw', 'pmc', 'tanks']
    CORS_ORIGIN_WHITELIST = [f'https://{subdomain}.{server_host}' for subdomain in cosr_origin_whitelist_subdomains]
    CORS_ALLOW_CREDENTIALS = True

    csrf_trusted_subdomains = ['madworld', 'mw', 'iframe.mw']
    CSRF_TRUSTED_ORIGINS = [f'{subdomain}.{server_host}' for subdomain in csrf_trusted_subdomains]
    CSRF_TRUSTED_ORIGINS.append(server_host)
    CSRF_COOKIE_DOMAIN = os.environ.get('CSRF_COOKIE_DOMAIN')
    CSRF_COOKIE_SECURE = True

SESSION_COOKIE_SAMESITE = None

REST_SESSION_LOGIN = False
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        # 'api.auth.token.TokenAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ),
    'DEFAULT_FILTER_BACKENDS': (
        'api.filters.FilterBackend',
        'rest_framework.filters.OrderingFilter',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticatedOrReadOnly',
    ),
    'DEFAULT_RENDERER_CLASSES': (
        'rest_framework.renderers.JSONRenderer',
        'apps.utils.rest_framework.BrowsableAPIRendererWithoutForms',
    ),
    'TEST_REQUEST_RENDERER_CLASSES': (
        'rest_framework.renderers.MultiPartRenderer',
        'rest_framework.renderers.JSONRenderer',
        'apps.utils.rest_framework.BinaryRenderer',
    ),
    'PAGE_SIZE': 10,
    'HTML_SELECT_CUTOFF': 100,
}
if ENVIRONMENT == 'PRODUCTION':
    REST_FRAMEWORK['DEFAULT_RENDERER_CLASSES'] = (
        'rest_framework.renderers.JSONRenderer',
    )
SWAGGER_SETTINGS = {
    'USE_SESSION_AUTH': False,
    'SECURITY_DEFINITIONS': {
        'basic': {
            'type': 'apiKey',
            'name': 'Token',
            'in': 'header',
        },
    },
    'LOGIN_URL': '/admin/login/',
    'LOGOUT_URL': '/admin/logout/',
    'DOC_EXPANSION': 'none',
    'DEFAULT_AUTO_SCHEMA_CLASS': 'api.schema.CustomSwaggerAutoSchema'
}
REDOC_SETTINGS = {
    'LAZY_RENDERING': True,
}

############
# Crawling #
############

CRAWLING_SAVE_IMAGES = ENVIRONMENT == 'PRODUCTION'
DISABLE_GAME_UPDATE_SIGNALS = os.environ.get('DISABLE_GAME_UPDATE_SIGNALS', False)

MONGO_HOST = 'mongo'
MONGO_PORT = 27017

##########
# Import #
##########

PROXY_ONE = os.environ.get('PROXY_ONE')
PROXY_TWO = os.environ.get('PROXY_TWO')
IMPORT_DATA = {
    # for developers
    'LOCAL': {
        'STEAM_API_KEY': '69655A76CEB24428EC62DA31DEAC103E',  # todo change it
        'XBOX_API_USERNAME': 'rawg.local@outlook.com',
        'XBOX_API_PASSWORD': 'UKHbul*BOTYOe5Uv',
        'PSN_API_USERNAME': 'sinkler+psn0@rawg.io',
        'PSN_API_PASSWORD': 'UKHbul*BOTYOe5Uv',
    },
    # production keys
    'PRODUCTION': {
        'STEAM_API_KEY': os.environ.get('STEAM_API_KEY_1'),
        'XBOX_API_USERNAME': os.environ.get('XBOX_API_USERNAME_1'),
        'XBOX_API_PASSWORD': os.environ.get('XBOX_API_PASSWORD_1'),
        'PSN_API_USERNAME': os.environ.get('PSN_API_USERNAME_1'),
        'PSN_API_PASSWORD': os.environ.get('PSN_API_PASSWORD_1'),
    },
    'ONE': {
        'STEAM_API_KEY': os.environ.get('STEAM_API_KEY_2'),
        'XBOX_API_USERNAME': os.environ.get('XBOX_API_USERNAME_2'),
        'XBOX_API_PASSWORD': os.environ.get('XBOX_API_PASSWORD_2'),
        'PSN_API_USERNAME': os.environ.get('PSN_API_USERNAME_2'),
        'PSN_API_PASSWORD': os.environ.get('PSN_API_PASSWORD_2'),
        'HTTP_PROXY': PROXY_ONE,
        'HTTPS_PROXY': PROXY_ONE,
    },
    'TWO': {
        'STEAM_API_KEY': os.environ.get('STEAM_API_KEY_3'),
        'XBOX_API_USERNAME': os.environ.get('XBOX_API_USERNAME_3'),
        'XBOX_API_PASSWORD': os.environ.get('XBOX_API_PASSWORD_3'),
        'PSN_API_USERNAME': os.environ.get('PSN_API_USERNAME_3'),
        'PSN_API_PASSWORD': os.environ.get('PSN_API_PASSWORD_3'),
        'HTTP_PROXY': PROXY_TWO,
        'HTTPS_PROXY': PROXY_TWO,
    },
}
IMPORT_KEY = 'PRODUCTION' if ENVIRONMENT == 'PRODUCTION' else 'LOCAL'

STEAM_API_KEY = os.environ.get('STEAM_API_KEY', IMPORT_DATA[IMPORT_KEY]['STEAM_API_KEY'])
XBOX_API_USERNAME = os.environ.get('XBOX_API_USERNAME', IMPORT_DATA[IMPORT_KEY]['XBOX_API_USERNAME'])
XBOX_API_PASSWORD = os.environ.get('XBOX_API_PASSWORD', IMPORT_DATA[IMPORT_KEY]['XBOX_API_PASSWORD'])
PSN_API_USERNAME = os.environ.get('PSN_API_USERNAME', IMPORT_DATA[IMPORT_KEY]['PSN_API_USERNAME'])
PSN_API_PASSWORD = os.environ.get('PSN_API_PASSWORD', IMPORT_DATA[IMPORT_KEY]['PSN_API_PASSWORD'])

RUN_IMPORTS = [IMPORT_DATA['LOCAL'] for i in range(0, 3)]
if ENVIRONMENT == 'STAGE':
    RUN_IMPORTS = [IMPORT_DATA['LOCAL']]
if ENVIRONMENT == 'PRODUCTION':
    RUN_IMPORTS = [
        IMPORT_DATA['PRODUCTION'],
        IMPORT_DATA['TWO'],
        IMPORT_DATA['ONE'],
    ]

ANTI_CAPTCHA_KEY = os.environ.get('ANTI_CAPTCHA_KEY')

#############
# External #
#############

MEDIUM_FEED = 'https://medium.com/feed/rawg'
REDDIT_URL = 'https://www.reddit.com/r/{}/'
IMGUR_URL = 'https://imgur.com/{}'
IMGUR_THUMB_URL = 'https://i.imgur.com/{}b.jpg'
IMGUR_THUMB_MEDIUM_URL = 'https://i.imgur.com/{}m.jpg'
POPULAR_GAMES_MIN_ADDED = 50
TWITCH_CLIENT_ID = 'zi52xk0oympq5c76mfiijoq5y80sia'
TWITCH_CLIENT_SECRET = '1qo1mfb7s7rj3o7b8ld3odb15dcyi8'
if ENVIRONMENT == 'PRODUCTION':
    TWITCH_CLIENT_ID = 'ygut7zr3srho00wk4qywp41g5ylcxn'
    TWITCH_CLIENT_SECRET = 'h9ebmdmntdbviynrv8hims0pcc5iky'
YOUTUBE_DEVELOPER_KEY = 'AIzaSyA0TtX2cHQuHBWGwGNhQKVVzpLfxknV2ho'
if ENVIRONMENT == 'PRODUCTION':
    YOUTUBE_DEVELOPER_KEY = 'AIzaSyBuKQlgIivpyl4c-gn_xSsLkjWYFcqoVaY'
YOUTUBE_DEVELOPER_KEY_STORIES = os.environ.get('YOUTUBE_DEVELOPER_KEY_STORIES', YOUTUBE_DEVELOPER_KEY)
IMGUR_CLIENT_ID = '41ade8dd72b4140'
if ENVIRONMENT == 'PRODUCTION':
    IMGUR_CLIENT_ID = 'c02d5a2f5eb2a4f'
EXTERNAL_TIMEOUT = 2

#############
# Constance #
#############

CONSTANCE_CONFIG = {
    'NEWS_TITLE': ('', ''),
    'NEWS_LINK': ('', ''),
    'NEWS_DATE': (datetime(year=1970, month=1, day=1), '', datetime),
    'IMPORT_XBOX_TOKENS': ('', ''),
    'IMPORT_PSN_TOKENS': ('', ''),
    'IMPORT_PSN_NPSSO': ('', 'https://github.com/isFakeAccount/psnawp#getting-started'),
}
CONSTANCE_CONFIG_FIELDSETS = OrderedDict([
    ('News', ('NEWS_TITLE', 'NEWS_LINK', 'NEWS_DATE')),
    ('Import', ('IMPORT_XBOX_TOKENS', 'IMPORT_PSN_TOKENS', 'IMPORT_PSN_NPSSO')),
])
CONSTANCE_BACKEND = 'constance.backends.database.DatabaseBackend'

##########
# Pusher #
##########

PUSHER_HOST = os.environ.get('PUSHER_HOST', 'poxa')
PUSHER_PORT = int(os.environ.get('PUSHER_PORT') or 8080)
PUSHER_APP_ID = os.environ.get('PUSHER_APP_ID') or ''
PUSHER_KEY = os.environ.get('PUSHER_KEY') or ''
PUSHER_SECRET = os.environ.get('PUSHER_SECRET') or ''
os.environ['NO_PROXY'] = PUSHER_HOST

#############
# Analytics #
#############

GA_ANALYTICS_EN = os.environ.get('GA_ANALYTICS_EN')
GA_ANALYTICS_RU = os.environ.get('GA_ANALYTICS_RU')

#######
# API #
#######

API_GROUP_FREE = 'free'
API_GROUP_BUSINESS = 'business'
API_GROUP_ENTERPRISE = 'enterprise'
API_GROUP_UNLIMITED = 'unlimited'
API_LIMITS = {
    API_GROUP_FREE: 20000,
    API_GROUP_BUSINESS: 50000,
    API_GROUP_ENTERPRISE: 1000000,
    API_GROUP_UNLIMITED: None,
}
OPEN_API = {
    'MAX_SCREENS': 6,
}

##########
# Stripe #
##########

STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY')
STRIPE_ENDPOINT_SECRET = os.environ.get('STRIPE_ENDPOINT_SECRET')
STRIPE_PRICE_ID = os.environ.get('STRIPE_PRICE_ID')

#########
# Other #
#########

DATA_UPLOAD_MAX_NUMBER_FIELDS = 2000
POOL_SIZE = 5
USE_ASYNCIO = ENVIRONMENT != 'TESTS'
SLACK_HOOK = os.environ.get('SLACK_HOOK')
SLACK_CHANEL = '#info'
ALLOWED_HOSTS_IN_TEXT = {
    'ag.ru', 'dev.ag.ru', 'cdn.ag.ru', 'media.ag.ru', 'devmedia.ag.ru',
    'youtube.com', 'www.youtube.com', 'youtu.be',
    'vimeo.com', 'www.vimeo.com', 'player.vimeo.com',
    'soundcloud.com', 'www.soundcloud.com', 'w.soundcloud.com',
    'coub.com', 'www.coub.com',
    'twitch.tv', 'www.twitch.tv', 'player.twitch.tv',
}
ALLOWED_CLASSES_IN_TEXT = {
    'editor__loader', 'editor__loader-icon', 'editor__insertion', 'editor__iframe-wrapper', 'editor__iframe',
}
TWITTER_LENGTH = 280
WARM_CACHE_APPS = ('games', 'banners', 'merger')
WARM_CACHE = os.environ.get('WARM_CACHE')
PROMO_SELECTS = [
    ('', '-'),
    ('e3', 'E3'),
    ('gamescom', 'Gamescom'),
    ('promo', 'Promo'),
]
GAMES_PROMO = os.environ.get('GAMES_PROMO')
FEED_PERIODICAL = os.environ.get('FEED_PERIODICAL')
MERGER_CHECK_TOKENS = os.environ.get('MERGER_CHECK_TOKENS')
CHECK_NEW_SCREENSHOTS = os.environ.get('CHECK_NEW_SCREENSHOTS')
USERS_STATISTICS_LIMIT = ENVIRONMENT != 'TESTS'

XSOLLA_MERCHANT_ID = os.environ.get('XSOLLA_MERCHANT_ID', '')
XSOLLA_API_KEY = os.environ.get('XSOLLA_API_KEY', '')
XSOLLA_PRODUCTION_MODE = os.environ.get('XSOLLA_MODE') == 'production'

DAV_STORE_CONFIG = {
    'SCHEME': os.environ.get('DAV_STORE_SCHEME', ''),
    'HOST': os.environ.get('DAV_STORE_HOST', '').strip('/'),
    'PATH': os.environ.get('DAV_STORE_PATH', '').strip('/'),
    'EXTERNAL_ADDRESS': os.environ.get('DAV_STORE_EXTERNAL_ADDRESS', '').strip('/')
}
