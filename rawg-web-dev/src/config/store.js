import { createStore, combineReducers, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';
import { routerMiddleware, routerReducer } from 'react-router-redux';
import { reducer as formReducer } from 'redux-form';
import { composeWithDevTools } from 'redux-devtools-extension';

import api from 'redux-logic/middlewares/api';
import env from 'config/env';

import appReducer from 'app/pages/app/app.reducer';
import currentUserReducer from 'app/components/current-user/current-user.reducer';
import gameReducer from 'app/pages/game/game.reducer';
import gameEditReducer from 'app/pages/game-edit/game-edit.reducer';
import personReducer from 'app/pages/person/person.reducer';
import profileReducer from 'app/pages/profile/profile.reducer';
import collectionReducer from 'app/pages/collection/collection.reducer';
import collectionsReducer from 'app/pages/collections/collections.reducer';
import searchReducer from 'app/pages/search/search.reducer';
import showcaseReducer from 'app/pages/showcase/showcase.reducer';
import calendarReducer from 'app/components/calendar/calendar.reducer';
import gamesReducer from 'app/pages/games/games.reducer';
import browseReducer from 'app/pages/browse/browse.reducer';
import browseListingReducer from 'app/pages/browse-listing/browse-listing.reducer';
import suggestionsReducer from 'app/pages/suggestions/suggestions.reducer';
import activityReducer from 'app/pages/activity/activity.reducer';
import reviewsReducer from 'app/pages/reviews/reviews.reducer';
import reviewReducer from 'app/pages/review/review.reducer';
import reviewCommentsReducer from 'app/components/review-comments/review-comments.reducer';
import postReducer from 'app/pages/post/post.reducer';
import tokensDashboardReducer from 'app/pages/tokens/tokens.reducer';
import tokensDashboardDataReducer from 'app/pages/tokens/tokens.data.reducer';
import notificationsReducer from 'app/pages/app/components/notifications/notifications.reducer';
import rateGamesReducer from 'app/pages/rate-games/rate-games.reducer';

import postCommentsReducer from 'app/components/post-comments/post-comments.reducer';
import collectionCommentsReducer from 'app/components/collection-feed-item-comments/collection-feed-item-comments.reducer';

import storiesReducer from 'app/components/stories/stories.reducer';
import discoverReducer from 'app/pages/discover/discover.reducer';
import discoverMainReducer from 'app/pages/discover-main/discover-main.reducer';

import entitiesReducer from 'redux-logic/entities';

import staticFiltersReducer from 'app/pages/games-static-filters/games-static-filters.reducers';
import programReducer from 'app/pages/program/program.reducer';

import leaderboardReducer from 'app/pages/leaderboard/leaderboard.reducer';
import sitemapReducer from 'app/pages/sitemap/sitemap.reducer';

const reducers = {
  routing: routerReducer,
  form: formReducer,
  entities: entitiesReducer,
  app: appReducer,
  currentUser: currentUserReducer,
  game: gameReducer,
  gameEdit: gameEditReducer,
  person: personReducer,
  profile: profileReducer,
  collection: collectionReducer,
  staticFilters: staticFiltersReducer,
  collections: collectionsReducer,
  search: searchReducer,
  showcase: showcaseReducer,
  calendar: calendarReducer,
  stories: storiesReducer,
  games: gamesReducer,
  browse: browseReducer,
  browseListing: browseListingReducer,
  suggestions: suggestionsReducer,
  programs: programReducer,
  activity: activityReducer,
  reviews: reviewsReducer,
  review: reviewReducer,
  reviewComments: reviewCommentsReducer,
  post: postReducer,
  postComments: postCommentsReducer,
  collectionComments: collectionCommentsReducer,
  tokensDashboard: tokensDashboardReducer,
  tokensDashboardData: tokensDashboardDataReducer,
  notifications: notificationsReducer,
  rateGames: rateGamesReducer,
  discover: discoverReducer,
  discoverMain: discoverMainReducer,
  leaderboard: leaderboardReducer,
  sitemap: sitemapReducer,
};

const composeEnhancers = composeWithDevTools({
  trace: env.isDev(),
});

export default function(history, initialState) {
  return createStore(
    combineReducers(reducers),
    initialState,
    composeEnhancers(applyMiddleware(thunk, api, routerMiddleware(history))),
  );
}
