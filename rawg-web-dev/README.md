# RAWG WEB

## Development

Environment variables:

* HOSTNAME _(default 0.0.0.0)_
* PORT _(default 4000)_
* API_ADDRESS _(default https://devapi.rawg.io)_

Run development env (development config, hot reload, without server side render)

```
npm run start:dev
```

Run development env without hot reloading:

```
HOTRELOAD=false npm run start:dev
```

Run production env (production config, with server side render)

```
npm run start:prod
```

Example with custom environment variables :

```
HOSTNAME=127.0.0.1 PORT=4001 API_ADDRESS=http://localhost:3000 npm run start:dev
```

Switch locale by query param
```
?locale=ru
```

## Storybook

Install storybook globally

`npm i -g @storybook/cli`

And then launch it:

`npm run storybook`

It will be served at: http://localhost:6006/

## Generators

You can easiliy generate new components by typing

`npm run generate`
