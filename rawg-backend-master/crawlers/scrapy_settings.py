import os

BOT_NAME = 'ag'

SPIDER_MODULES = ['spiders']
NEWSPIDER_MODULE = 'spiders'

CONCURRENT_REQUESTS = 10
CONCURRENT_REQUESTS_PER_DOMAIN = 10

DOWNLOAD_DELAY = 1

ITEM_PIPELINES = {
    'pipelines.MongoPipeline': 100,
}

MONGO_URI = 'mongodb://mongo:27017/'
MONGO_DATABASE = 'games'

ENVIRONMENT = os.environ.get('ENVIRONMENT', 'DOCKER')

if os.environ.get('SENTRY_DSN'):
    import sentry_sdk
    sentry_sdk.init(dsn=os.environ['SENTRY_DSN'])
    EXTENSIONS = {
        'sentry_scrapy.extension.SentryExtension': 10,
    }
