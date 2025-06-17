# AG

# Requirements

- Docker
- Python 3.7
- PostgreSQL
- Elasticsearch
- RabbitMQ (for celery)
- MongoDB (for crawlers)

# Installation

`docker-compose run --rm web manage migrate`  
`docker-compose run --rm web manage createsuperuser`  
`docker-compose run --rm web manage loaddata common_lists games_developers games_games games_genres \
 games_esrbratings games_platforms games_platforms_parents games_publishers games_stores games_tags reviews_reactions`  
`docker-compose up`

# Database Loading

`scp staging0:/home/docker/backend/db_dev.dump .`  
`docker-compose up -d postgres`  
`docker exec -i rawg-postgres pg_restore -U application -d application --verbose < db_dev.dump`  
`rm db_dev.dump`

# Elastic Index Loading

The long way:

`docker-compose run --rm web manage update_index -r -v 3`

The fast and dirty way, do it several times until the count of synchronized files will be zero:

`rsync -azP --delete staging0:/mnt/data/docker/volumes/backend_elastic/_data/ data/elastic/`

To fix readonly state:

`curl -X PUT http://localhost:9200/rawg/_settings -d '{"index.blocks.read_only_allow_delete": null}' -H "Content-Type: application/json"`

for all clusters

`curl -X PUT http://localhost:9200/_all/_settings -d '{"index.blocks.read_only_allow_delete": null}' -H "Content-Type: application/json"`

# Workflow

We use the [GitHub Flow](https://guides.github.com/introduction/flow/)

To work on a some issue, you should follow these steps:

- Create a new [branch](https://github.com/behindthegames/rawg/blob/styleguide-rules/README.md#branches)
- Make some [commits](https://github.com/behindthegames/rawg/blob/styleguide-rules/README.md#commits)
- Open a Pull Request
- Review your code
- Merge and deploy

# Coding Style

See [Django Coding style](https://docs.djangoproject.com/en/dev/internals/contributing/writing-code/coding-style/)

# Git Style Guide

### Branches

- Choose short and descriptive names
- Use hyphens to separate words

### Commits

- Each commit should be an atomic logical change
- Use terminal (`git commit -m`) for short messages (less than 50 characters). Capitalize the message line and use imperative mood
- Use editor (`git commit`) for long messages (more than 50 characters)
- Separate subject line from body text with a blank line
- Limit the subject line to 50 characters
- Capitalize the subject line. Do not end it with a period
- Use the imperative mood in the subject line
- Body text should answer `why` and `what`, not `how`

# Tests And Checks

Run a test:

`docker-compose run --rm web fab tests:apps.tests.api.tests_auth.AuthTestCase.test_register`

Run a test and save an email in a file:

`docker-compose run --rm web fab tests:apps.tests.api.tests_shop.ProductTestCase.test_buy_product_mail,mail=True`

Run `isort`:

`docker-compose run --rm web fab isort`

Run `flake8`:

`docker-compose run --rm web fab flake8`

# Updating Requirements

See [https://github.com/nvie/pip-tools](https://github.com/nvie/pip-tools)

`docker-compose run --rm web fab pip_compile`  
`docker-compose run --rm web fab pip_upgrade`
`docker-compose run --rm web fab pip_upgrade:pip-tools`

# Celery

If you are going to use celery chains, don't use retries in tasks, don't use `acks_late` and `reject_on_worker_lost` 
options and set `max_retries` on calling:

`celery.chain(*chain).apply_async(max_retries=300, interval=1)`

# Crawler

On a local machine:

`docker-compose run --rm web fab scrapy:steam`  
`docker-compose run --rm web fab scrapy:steam_update`  
`docker-compose run --rm web fab scrapy:ios,60.13.74.183:843`  
`docker-compose run --rm -e DISABLE_GAME_UPDATE_SIGNALS=1 web manage load_from_mongo all`

On the production stage in detached mode:

`docker-compose -f docker-compose.yml -f help.yml run -d help fab scrapy:steam_update`  
`docker-compose -f docker-compose.yml -f help.yml run -d help manage load_from_mongo all`

# Import And Synchronization

On a local machine:

Import games: `docker-compose run --rm web manage import`  
Sync games without achievements: `docker-compose run --rm web manage import --sync`  
Sync one user with achievements: `docker-compose run --rm web manage sync 0 --user_id 123`

# Quick Docker Help

- show the list of images: `docker image ls` or `docker images`
- show the list of containers: `docker container ls -a` or `docker ps -a`
- stop all containers: `docker stop $(docker ps -q)`
- clear stopped containers: `docker container prune`
- clear dangling images: `docker image prune`
- clear dangling volumes: `docker volume prune`
- clear networks: `docker network prune`
