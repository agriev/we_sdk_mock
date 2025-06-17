from fabric.api import lcd, local, task


@task
def tests(
    test='', command='python', tags='', keepdb=True, failfast=False, verbose=2, mail=False, parallel=None,
    language=None
):
    test = test.replace('#', '.')
    args = ' --noinput -v {}{}{}'.format(verbose, ' -k' if keepdb else '', ' --failfast' if failfast else '')
    if tags:
        tags = '--tag={}'.format(tags)
    if language:
        command = 'LANGUAGE={} {}'.format(language, command)
    if mail:
        command = 'TESTS_ENVIRONMENT=LOCAL_MAIL {}'.format(command)
    parallel = f'--parallel={parallel}' if parallel else ''
    local(f'ENVIRONMENT=TESTS {command} manage.py test {tags} {args} {test} {parallel}')


@task
def tests_mail(email='', email_second='', keepdb=True, language=None):
    tests(command='TESTS_ENVIRONMENT=MAIL TEST_EMAIL={} TEST_EMAIL_SECOND={} python'.format(
        email, email_second
    ), tags='mail', keepdb=keepdb, verbose=3, language=language)


@task()
def tests_deploy():
    isort()
    flake8()
    tests(
        command='TESTS_ENVIRONMENT=DEPLOY coverage run --parallel-mode --concurrency=multiprocessing',
        keepdb=False,
        verbose=3,
        parallel=4
    )
    local('coverage combine')
    local('coverage report')
    local('rm .coverage')


@task
def coverage(keepdb=False):
    tests(command='coverage run', keepdb=keepdb)
    local('coverage report')
    local('coverage html')
    local('rm .coverage')


@task
def coverage_part(tags='', keepdb=True):
    tests(tags=tags, command='coverage run', keepdb=keepdb)
    local('coverage report')
    local('coverage html')
    local('rm .coverage')


@task
def isort(check_only=True):
    with lcd('..'):
        local(f'isort --recursive{" --check-only --diff" if check_only else ""} crawlers project')


@task
def flake8():
    with lcd('..'):
        local('flake8 crawlers project')


@task
def pip_compile():
    with lcd('../config'):
        local('rm -rf src')
        local('pip-compile --output-file requirements.txt requirements.in')
        local('rm -rf src')


@task
def pip_upgrade(package=''):
    with lcd('../config'):
        local('rm -rf src')
        if not package:
            local('pip-compile --upgrade')
        else:
            local(f'pip-compile --upgrade-package {package}')
        local('rm -rf src')


@task
def scrapy(crawler, proxy=None, log_level=None):
    with lcd('../crawlers'):
        local('DJANGO_SETTINGS_MODULE=settings PYTHONPATH=../::../project/ {}scrapy crawl {}{}'.format(
            'http_proxy=http://{} '.format(proxy) if proxy else '',
            '-L {} '.format(log_level) if log_level else '',
            crawler,
        ))


@task
def celery_purge():
    local('celery -A apps purge -f')


@task
def clear_cache():
    local('echo "from django.core.cache import cache; cache.clear()" | ENVIRONMENT=TESTS python manage.py shell')
