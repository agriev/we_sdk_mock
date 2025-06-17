# new-sdk-solution

Полноценный стенд для HTML5-игр: Django-бэкенд, Vue 3-фронтенд, JS-SDK и тестовая игра Tetris.

## Состав

```
new-sdk-solution/
├── backend/        # Django 4 + DRF + JWT + WhiteNoise
├── frontend/       # Vue 3 + Vite + Element-Plus
├── sdk-js/         # we-h5-games-sdk (UMD bundle)
├── games/          # HTML5-игры, сейчас только tetris/
└── docker-compose.yml
```

## Быстрый запуск

1. Установите Docker Desktop >= 4.x.
2. В корне проекта выполните:

```bash
# клон репо уже сделан
cd new-sdk-solution
# собрать образы и поднять сервисы
docker-compose up --build
```

3. Доступы:

| URL | что это |
|-----|---------|
| http://localhost | фронтенд (каталог, игры) |
| http://localhost/api/ | REST-API |
| http://localhost/admin/ | Django-admin (логин/пароль – создайте superuser) |

Чтобы создать суперпользователя:

```bash
docker-compose run --rm backend python manage.py createsuperuser
```

## Структура API

* `GET /api/games/` – список активных игр.
* `POST /api/payments/` – «оплата» (фиктивная). Требует JWT-токен; SDK получает его через `/api/auth/anonymous/` автоматически.
* `POST /api/auth/anonymous/` – анонимный JWT.

## SDK

Минимальный набор методов, повторяющий WeChat JS-SDK:

```js
wx.login();                // возвращает { access, refresh }
wx.requestPayment({
  gameId: 1,
  amount: 1.00,
});
wx.shareAppMessage({
  title: 'Hello',
  url: location.href,
});
```

Бандл находится по пути `/static/sdk.js`, поэтому в игре достаточно:

```html
<script src="/static/sdk.js"></script>
```

## Разработка

```bash
# backend: live-reload
cd backend/src
pip install -r ../requirements.txt
django-admin runserver

# frontend: vite dev-сервер
cd frontend
npm i
npm run dev
```

## TODO / идеи

* Реальный платёжный шлюз вместо фиктивного.
* Настроить CI (GitHub Actions) и автопубликацию SDK в CDN.
* Больше игр и витрина с фильтрами/поиском.
* Авто-линтинг (ruff/flake8) и типизация (mypy). 