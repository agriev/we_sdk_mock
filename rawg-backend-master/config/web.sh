#!/usr/bin/env bash

set -e

case "$1" in
    manage)
        cd project && python manage.py "${@:2}"
    ;;
    python)
        python "${@:2}"
    ;;
    fab)
        cd project && fab "${@:2}"
    ;;
    bash)
        bash
    ;;
    import)
        python project/manage.py write_import_services
        /usr/bin/runsvdir /etc/service
    ;;
    *)
        folder=${ENVIRONMENT,,}
        if [[ -z "${NEW_RELIC_LICENSE_KEY+x}" ]]
        then
            if [[ "$folder" = "docker" ]]
            then
                python project/manage.py runserver 0.0.0.0:8000
            else
                uwsgi --ini "/app/config/${folder}/uwsgi.ini"
            fi
        else
            NEW_RELIC_CONFIG_FILE=/app/config/newrelic.ini newrelic-admin run-program \
                uwsgi --ini "/app/config/${folder}/uwsgi.ini"
        fi
    ;;
esac
