export default `
__The largest open video games database__

There are two types of companies: hoarders and givers. RAWG is the largest video game database and game discovery service. And we are gladly sharing our __480,000+__ games, search, and machine learning recommendations with the world. Learn what the RAWG games database API can do and build something cool with it!

<a href="https://api.rawg.io/docs/" target="_blank" rel="noopener noreferrer" style="float: left; margin: 0 16px 16px 0;">
  <button class="button button_fill button_medium">View the documentation</button>
</a>

<a href="/login?forward=developer" target="_blank" rel="noopener noreferrer">
  <button class="button button_fill button_medium">Get an API Key</button>
</a>

## Adding the API key to your request

You must include an API key with every request. In the following example, replace YOUR_API_KEY with your API key.
\`\`\`
GET https://api.rawg.io/api/platforms?key=YOUR_API_KEY
GET https://api.rawg.io/api/games?key=YOUR_API_KEY&dates=2019-09-01,2019-09-30&platforms=18,1,7
\`\`\`

## Why build on RAWG

- More than __480,000__ games for 50 platforms including mobiles. Plus __58 000__ tags, __2 100 000__ screenshots, __1 100 000__ ratings, __220 000__ developers, __45 000__ publishers, __24 000__ individual creators.
- Comprehensive video game data: descriptions, genres, release dates, links to stores, ESRB-ratings, average playtime, gameplay videos,
Metacritic ratings, official websites, system requirements, linked youtube and twitch videos,
dlc's and part of the series lists.
- Where to buy: links to digital distribution services.
- Similar games based on visual similarity.
- Player activity data: Steam average playtime and RAWG player counts and ratings.
- Actively developing and constantly getting better by user contribution and our algorithms.

## Plans

- __Free__. Great for personal and hobby projects. 480 000+ video games data, completely free for non-commercial projects, 20 000 requests per month, required backlinks to RAWG from pages where data is used.
- __Business__. For small and mid size companies. All in Free Plan + where to buy links, gameplay videos, similar games, linked twitch and youtube videos, commercial use allowed, 50 000 requests per month, email support. [Contact us](mailto:api@rawg.io).
- __Enterprise__. All in Business Plan + downloadable file api, 1 000 000 requests per month, email support, custom data requests. [Contact us](mailto:api@rawg.io).

## Some apps using our API

- [Yandex](https://yandex.ru) uses RAWG to create new and enrich existing reference cards in its search engine results.
- The [Reddit games recommendations](https://www.reddit.com/user/GameSuggestionsBot) bot by Laundmo ([Python, Gitlab](https://gitlab.com/laundmo/gamingsuggestions-link-bot)). Over 60,000 redditors can use it.
- The games search in the [Erisly](https://erisly.com/) bot on Discord. Over 70,000 connected Discord servers use it.
- The [DTF bot](https://dtf.ru/team/47794-rawg-bot-v-kommentariyah-dtf-i-zapusk-publichnogo-api) by [Samat](https://samat.me/) ([Python, Github](https://github.com/behindthegames/dtf-bot)). DTF is one of the largest Russian gaming news website with an active community.
- The [Telegram bot](https://t.me/rawgthebot) by [Roman](https://github.com/believer-ufa) ([PHP, Github](https://github.com/behindthegames/telegram-bot-php)).

## Terms of Use

- Free for personal use as long as you attribute RAWG as the source of the data and/or images and add an active hyperlink from every page where the data of RAWG is used.
- Free for commercial use for startups and hobby projects with not more than 100,000 monthly active users or 500,000 page views per month. If your project is larger than that, email us at [api@rawg.io](mailto:api@rawg.io) for commercial terms.
- No cloning. It would not be cool if you used our API to launch a clone of RAWG. We know it is not always easy to say what is a duplicate and what isn't. Drop us a line at [api@rawg.io](mailto:api@rawg.io) if you are in doubt, and we will talk it through.

## API Legal Notice

We do not claim ownership of any of the images or data provided by the API. We remove infringing content when properly notified. Any data and/or images one might upload to RAWG is expressly granted a license to use. You are prohibited from using the images and/or data in connection with libelous, defamatory, obscene, pornographic, abusive or otherwise offensive content.

## Questions

If you have any questions about our API — we'd love to help. Email us at [api@rawg.io](mailto:api@rawg.io), tweet at [@rawgtheworld](https://twitter.com/rawgtheworld) or ask the community at our [Discord](https://discord.gg/erNybDp).


## Latest updates
- Add ESRB-ratings to lists endpoints for easier filtering based on age rating.
- Metacritic can be used as a filtering and sorting option. Filter: https://api.rawg.io/api/games?metacritic=80,100. Sort: https://api.rawg.io/api/games?ordering=-metacritic.
- Add non-fuzzy search option. To turn off fuzziness: https://api.rawg.io/api/games?search=303%20squadron&search_precise=true. To search by exact term: https://api.rawg.io/api/games?search=303%20squadron&search_exact=true.
- Add an API key-based requests signing. The old method of signing with User Agent string will be slowly deprecated.
- Add an option to search for games with recently updated data: https://api.rawg.io/api/games?updated=2020-01-01,2020-12-31.
- Add last update date to game details endpoint. Useful to know if there is any new info to grab.
- Add system requirements field to game details endpoint.
- Add separate Metacritic ratings for each game platform.


## API Wrappers by our community

All of the libraries are contributed by our users. If you find a bug or missing feature, it's best to contact the author. If you want to submit your wrapper, contact us via [api@rawg.io](mailto:api@rawg.io)

- [Python](https://pypi.org/project/rawgpy/) (by Laundmo)
- [Python](https://github.com/uburuntu/rawg) (by uburuntu)
- [Node](https://www.npmjs.com/package/rawger) (by orels1)
- [Android](https://github.com/Gruzer/Android-RAWG-API-Wrapper) (by Gruzer)
- [PHP](https://github.com/dimuska139/rawg-sdk-php) (by dimuska139)
- [Go](https://github.com/dimuska139/rawg-sdk-go) (by dimuska139)

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

`;
