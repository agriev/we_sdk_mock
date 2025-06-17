export default `
__The largest open video games database__

There are two types of companies: hoarders and givers. RAWG is the largest video game database and game discovery service. And we are gladly sharing our 350,000+ games, search, and machine learning recommendations with the world. Learn what the RAWG games database API can do and build something cool with it!

[View the documentation](https://api.rawg.io/docs/)

## Why build on RAWG

- More than 480,000 games for 50 platforms including mobiles.
- Rich metadata: tags, genres, developers, publishers, individual creators, official websites, release dates, Metacritic ratings.
- Where to buy: links to digital distribution services
- Similar games based on visual similarity.
- Player activity data: Steam average playtime and RAWG player counts and ratings.
- Actively developing and constantly getting better by user contribution and our algorithms.

## Example usecases

RAWG API is a powerful tool for working with video games data. Below are a few examples of the things you can do with the API.

What console games were released last month?
\`\`\`
GET https://api.rawg.io/api/platforms # get ids of target platforms
GET https://api.rawg.io/api/games?dates=2019-09-01,2019-09-30&platforms=18,1,7 # insert platforms ids
\`\`\`

What are the most anticipated upcoming games?
\`\`\`
GET https://api.rawg.io/api/games?dates=2019-10-10,2020-10-10&ordering=-added
\`\`\`

What games were published by Annapurna Interactive in the 2019?
\`\`\`
GET https://api.rawg.io/api/developers?search=Annapurna%20Interactive&page_size=1 # get the developer id
GET https://api.rawg.io/api/games?dates=2019-01-01,2019-12-31&developers=15 # insert developer id
\`\`\`

What are the most popular games in 2019?
\`\`\`
GET https://api.rawg.io/api/games?dates=2019-01-01,2019-12-31&ordering=-added
\`\`\`

What are the highest rated games from 2001?
\`\`\`
GET https://api.rawg.io/api/games?dates=2001-01-01,2001-12-31&ordering=-rating
\`\`\`

What is the highest rated game by Electronic Arts?
\`\`\`
GET https://api.rawg.io/api/developers?search=Electronic%20Arts&page_size=1 # get the developer id
GET https://api.rawg.io/api/games?ordering=-rating&developers=109 # insert developer id
\`\`\`

## API Wrappers

All of the libraries are contributed by our users. If you find a bug or missing feature, it's best to contact the author. If you want to submit your wrapper, contact us via [api@rawg.io](api@rawg.io)

- [Python](https://pypi.org/project/rawgpy/) (by Laundmo)
- [Python](https://github.com/uburuntu/rawg) (by uburuntu)
- [Node](https://www.npmjs.com/package/rawger) (by orels1)
- [Android](https://github.com/Gruzer/Android-RAWG-API-Wrapper) (by Gruzer)
- [PHP](https://github.com/dimuska139/rawg-sdk-php) (by dimuska139)
- [Go](https://github.com/dimuska139/rawg-sdk-go) (by dimuska139)

## Some apps using our API

- [Yandex](https://yandex.ru) uses RAWG to create new and enrich existing reference cards in its search engine results.
- The [Reddit games recommendations](https://www.reddit.com/user/GameSuggestionsBot) bot by Laundmo ([Python, Gitlab](https://gitlab.com/laundmo/gamingsuggestions-link-bot)). Over 60,000 redditors can use it.
- The games search in the [Erisly](https://erisly.com/) bot on Discord. Over 70,000 connected Discord servers use it.
- The [DTF bot](https://dtf.ru/team/47794-rawg-bot-v-kommentariyah-dtf-i-zapusk-publichnogo-api) by [Samat](https://samat.me/) ([Python, Github](https://github.com/behindthegames/dtf-bot)). DTF is one of the largest Russian gaming news website with an active community.
- The [Telegram bot](https://t.me/rawgthebot) by [Roman](https://github.com/believer-ufa) ([PHP, Github](https://github.com/behindthegames/telegram-bot-php)).

## Terms of Use

- Every API request should have a User-Agent header with your app name. If you don’t provide it, we may ban your requests.
- Commercial projects need our consent, email at [api@rawg.io](api@rawg.io) and we will figure out the terms.
- No mass extraction. If you need the whole dataset for research or any other purpose — drop us a line at [api@rawg.io](api@rawg.io) and we will figure out how we can help you.
- No cloning. It would not be cool if you used our API to launch a clone of RAWG. We know it is not always easy to say what is a duplicate and what isn't. Drop us a line at [api@rawg.io](api@rawg.io) if you are in doubt, and we will talk it through.
- Don't forget to backlink to RAWG from every page where RAWG data is used and mention it as your data source.

## Questions

If you have any questions about our API — we'd love to help. Email us at [api@rawg.io](mailto:api@rawg.io), tweet at [@rawgtheworld](https://twitter.com/rawgtheworld) or ask the community at our [Discord](https://discord.gg/erNybDp).
`;
