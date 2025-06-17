import createdCollection from './created-collection';
import addedGamesToCollection from './added-games-to-collection';
import addedOneGameToCollection from './added-one-game-to-collection';
import addedFeedToCollection from './added-feed-to-collection';
import addedReview from './added-review';
import addedDiscussion from './added-discussion';
import markedGamePlaying from './marked-game-playing';
import marked2GamesPlaying from './marked-2-games-playing';
import markedGameBeaten from './marked-game-beaten';
import marked2GamesBeaten from './marked-2-games-beaten';
import followedUser from './followed-user';
import followed6Users from './followed-6-users';
import followedCollection from './followed-collection';
import suggestedGameToCollection from './suggested-game-to-collection';

import popularGames from './popular-games';
import mostRatedGames from './most-rated-games';
import offerRateGame from './offer-rate-game';

export default {
  count: 30,
  next: null,
  loading: false,
  previous: null,
  results: [
    offerRateGame,
    mostRatedGames,
    popularGames,
    createdCollection,
    addedGamesToCollection,
    addedOneGameToCollection,
    addedReview,
    addedDiscussion,
    markedGamePlaying,
    marked2GamesPlaying,
    markedGameBeaten,
    marked2GamesBeaten,
    followedUser,
    followed6Users,
    addedFeedToCollection,
    followedCollection,
    suggestedGameToCollection,
  ],
};
