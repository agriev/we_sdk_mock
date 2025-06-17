# Accounts connecting

## How to run a Steam import after Steam account connecting

Mentions: `api.auth.views.SteamLoginView`

При подключении стим-аккаунта посылается такой запрос:

```
post /api/auth/steam
{
  "open_id": "76561198055555575",
  "key": "..."
}
```

Если пользователь привязывает аккаунт (то есть авторизован и выполняет этот метод), 
то в ответе отдаётся поле `steam_id`:

```
{
  "key": "44ff9ec136e54022c40eb5529d31d0e1a0abd648",
  "new": false,
  "steam_id": "https://steamcommunity.com/profiles/76561198055555575/"
}
```

Чтобы запустить импорт берём это поле и отправляем как обычно в профиль:

```
patch /api/users/current
{
  "steam_id": "https://steamcommunity.com/profiles/76561198055555575/"
}
```

В ответе как обычно будет либо успех, либо ошибка валидации.
