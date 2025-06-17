import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { hot } from 'react-hot-loader/root';
import { compose } from 'recompose';
import { denormalize } from 'normalizr';
import { Link } from 'app/components/link';

import get from 'lodash/get';

import '../discover/discover.styl';
import './discover-main.styl';

import prepare from 'tools/hocs/prepare';
import len from 'tools/array/len';

import config from 'config/config';
import Schemas from 'redux-logic/schemas';

import appHelper from 'app/pages/app/app.helper';
import { setDiscoverDisplayMode, loadDiscoverFollowings } from 'app/pages/discover/discover.actions';

import DiscoverPage from 'app/ui/discover-page';

import currentUserType from 'app/components/current-user/current-user.types';
import { appSizeType, appRatingsType, appFirstRenderType, appTokenType } from 'app/pages/app/app.types';

import {
  discoverMainLoadingStarted,
  discoverMainLoadingFinished,
  NOTEWORTHY_PAGE_SIZE,
  BECAUSE_COMPLETED_PAGE_SIZE,
  // PLATFORM_EXCLUSIVES_PAGE_SIZE,
  FRIENDS_PLAYING_PAGE_SIZE,
  NEW_FOLLOW_PAGE_SIZE,
  NEXT_MONTH_PAGE_SIZE,
  POPULAR_IN_WISHLISTS_PAGE_SIZE,
  loadNoteworthy,
  loadBecauseCompleted,
  loadFriendsReviews,
  loadFriendsPlaying,
  loadNewFollow,
  // loadPlatformsExclusives,
  loadNextMonth,
  loadPopularInWishlists,
  loadFeatured,
  loadFeaturedReviews,
  loadCollection,
  COLLECTION_GAMES_PAGE_SIZE,
} from 'app/pages/discover-main/discover-main.actions';
import denormalizeGamesArr from 'tools/redux/denormalize-games-arr';
import denormalizeArr from 'tools/redux/denormalize-array';

import gameType from 'app/pages/game/game.types';
import reviewType from 'app/pages/review/review.types';
import locationShape from 'tools/prop-types/location-shape';

import Heading from 'app/ui/heading/heading';
import SimpleIntlMessage from 'app/components/simple-intl-message';

import Loading2 from 'app/ui/loading-2';

import paths from 'config/paths';
import { DISCOVER_SEC_FRIENDS, DISCOVER_SEC_RECENT_PAST } from 'app/pages/discover/discover.sections';
import DiscoverMainGamesList from './components/games-list';
import DiscoverMainGamePoster from './components/game-poster';
import DiscoverMainReviewsList from './components/reviews-list';

import {
  getNoteworthyLoader,
  getNextMonthLoader,
  getPopularLoader,
  getFollowLoader,
  getFriendsLoader,
  getCompletedLoader,
  getReviewsLoader,
  getCollectionsData,
} from './discover-main.loaders';

const hoc = compose(
  hot,
  prepare(async ({ store }) => {
    const { token } = store.getState().app;

    await store.dispatch(discoverMainLoadingStarted());

    await Promise.all([
      store.dispatch(setDiscoverDisplayMode()),
      store.dispatch(loadDiscoverFollowings()),
      store.dispatch(loadNoteworthy({ token })),
      store.dispatch(loadNextMonth({ token })),
      store.dispatch(loadBecauseCompleted({ token })),
      store.dispatch(loadFriendsReviews({ token })),
      store.dispatch(loadFeaturedReviews({ token })),
      store.dispatch(loadFriendsPlaying({ token })),
      store.dispatch(loadNewFollow({ token })),
      store.dispatch(loadPopularInWishlists({ token })),
      store.dispatch(loadFeatured({ token })),
      store.dispatch(loadCollection({ token })),
      // store.dispatch(loadPlatformsExclusives({ token })),
    ]);

    await store.dispatch(discoverMainLoadingFinished());
  }),
  connect((state) => ({
    appSize: state.app.size,
    token: state.app.token,
    firstRender: state.app.firstRender,
    currentUser: state.currentUser,
    allRatings: state.app.ratings,
    noteworthyGames: denormalizeGamesArr(state, 'discoverMain.noteworthy.items'),
    noteworthyData: state.discoverMain.noteworthy,
    nextMonthGames: denormalizeGamesArr(state, 'discoverMain.nextMonth.items'),
    nextMonthData: state.discoverMain.nextMonth,
    popularInWishlistsGames: denormalizeGamesArr(state, 'discoverMain.popularInWishlists.items'),
    popularInWishlistsData: state.discoverMain.popularInWishlists,
    becauseCompletedGames: denormalizeGamesArr(state, 'discoverMain.becauseCompleted.items'),
    becauseCompletedData: state.discoverMain.becauseCompleted,
    becauseCompletedGame: denormalize(state.discoverMain.becauseCompleted.game, Schemas.GAME, state.entities),
    friendsReviews: denormalizeArr(state, 'discoverMain.friendsReviews.items', 'REVIEW_ARRAY'),
    friendsReviewsData: state.discoverMain.friendsReviews,
    featuredReviews: denormalizeArr(state, 'discoverMain.featuredReviews.items', 'REVIEW_ARRAY'),
    featuredReviewsData: state.discoverMain.featuredReviews,
    friendsPlayingGames: denormalizeGamesArr(state, 'discoverMain.friendsPlaying.items'),
    friendsPlayingData: state.discoverMain.friendsPlaying,
    newFollowGames: denormalizeGamesArr(state, 'discoverMain.newFollow.items'),
    newFollowData: state.discoverMain.newFollow,
    featuredGames: denormalizeGamesArr(state, 'discoverMain.featured.items'),
    featuredData: state.discoverMain.featured,
    collection: get(state, 'collections.popular.results.0'),
    collectionFeed: denormalize(state.collection.feed.results, Schemas.COLLECTION_FEED_ARRAY, state.entities),
    collectionFeedData: state.collection.feed,
    wholeLoading: state.discoverMain.wholeLoading,
    // platformsExGames: denormalizeGamesArr(
    //   state,
    //   'discoverMain.platformsExclusives.items',
    // ),
    // platformsExData: state.discoverMain.platformsExclusives,
  })),
);

const propTypes = {
  location: locationShape.isRequired,
  appSize: appSizeType.isRequired,
  token: appTokenType,
  firstRender: appFirstRenderType.isRequired,
  currentUser: currentUserType.isRequired,
  allRatings: appRatingsType.isRequired,
  dispatch: PropTypes.func.isRequired,
  noteworthyGames: PropTypes.arrayOf(gameType).isRequired,
  noteworthyData: PropTypes.shape().isRequired,
  nextMonthGames: PropTypes.arrayOf(gameType).isRequired,
  nextMonthData: PropTypes.shape().isRequired,
  popularInWishlistsGames: PropTypes.arrayOf(gameType).isRequired,
  popularInWishlistsData: PropTypes.shape().isRequired,
  becauseCompletedGames: PropTypes.arrayOf(gameType).isRequired,
  becauseCompletedGame: gameType,
  becauseCompletedData: PropTypes.shape().isRequired,
  friendsReviews: PropTypes.arrayOf(reviewType).isRequired,
  friendsReviewsData: PropTypes.shape().isRequired,
  featuredReviews: PropTypes.arrayOf(reviewType).isRequired,
  featuredReviewsData: PropTypes.shape().isRequired,
  friendsPlayingGames: PropTypes.arrayOf(gameType).isRequired,
  friendsPlayingData: PropTypes.shape().isRequired,
  newFollowGames: PropTypes.arrayOf(gameType).isRequired,
  newFollowData: PropTypes.shape().isRequired,
  featuredGames: PropTypes.arrayOf(gameType).isRequired,
  featuredData: PropTypes.shape().isRequired,
  // platformsExGames: PropTypes.arrayOf(gameType).isRequired,
  // platformsExData: PropTypes.shape().isRequired,
  collection: PropTypes.shape().isRequired,
  collectionFeed: PropTypes.arrayOf(PropTypes.shape({})),
  collectionFeedData: PropTypes.shape().isRequired,
  wholeLoading: PropTypes.bool.isRequired,
};

const defaultProps = {
  token: undefined,
  collectionFeed: [],
};

const DiscoverMainPage = ({
  location,
  appSize,
  token,
  firstRender,
  dispatch,
  currentUser,
  allRatings,
  wholeLoading,
  noteworthyGames,
  noteworthyData,
  nextMonthGames,
  nextMonthData,
  popularInWishlistsGames,
  popularInWishlistsData,
  becauseCompletedGames,
  becauseCompletedGame,
  becauseCompletedData,
  friendsReviews,
  friendsReviewsData,
  featuredReviews,
  featuredReviewsData,
  friendsPlayingGames,
  friendsPlayingData,
  newFollowGames,
  newFollowData,
  featuredGames,
  // featuredData,
  // platformsExGames,
  // platformsExData,
  collection,
  collectionFeed,
  collectionFeedData,
}) => {
  const isPhoneSize = appHelper.isPhoneSize(appSize);
  const beautifyLines = true;
  const gamesListCommonProperties = {
    appSize,
    firstRender,
    dispatch,
    currentUser,
    token,
    allRatings,
    beautifyLines,
  };

  const { reviews, reviewsData, reviewsMessage, reviewsPageSize } = getReviewsLoader({
    friendsReviews,
    friendsReviewsData,
    featuredReviews,
    featuredReviewsData,
    dispatch,
    token,
  });

  const noteworthyLoader = getNoteworthyLoader(noteworthyData, dispatch, token);
  const nextMonthLoader = getNextMonthLoader(nextMonthData, dispatch, token);
  const popularLoader = getPopularLoader(popularInWishlistsData, dispatch, token);
  const completedLoader = getCompletedLoader(becauseCompletedData, dispatch, token);
  const friendsLoader = getFriendsLoader(friendsPlayingData, dispatch, token);
  const followLoader = getFollowLoader(newFollowData, dispatch, token);

  const featuredGame = get(featuredGames, '[0]');
  const featuredGame2 = get(featuredGames, '[1]');

  const { collectionData, collectionGames, collectionLoader } = getCollectionsData({
    collection,
    collectionFeed,
    collectionFeedData,
    dispatch,
  });

  return (
    <DiscoverPage
      className="discover-main"
      pathname={location.pathname}
      isPhoneSize={isPhoneSize}
      pageProperties={{
        helmet: {
          noindex: config.features.discoverNewMain === false,
        },
        sidebarProperties: {
          needControls: true,
        },
      }}
    >
      {!wholeLoading && <Loading2 className="discover-main__whole-loading" radius={48} stroke={2} />}
      {wholeLoading && (
        <>
          <Heading rank={2}>
            <Link to={paths.reviewsBest}>
              <SimpleIntlMessage id={reviewsMessage} />
            </Link>
          </Heading>
          <DiscoverMainReviewsList
            {...gamesListCommonProperties}
            {...reviewsData}
            reviews={reviews}
            pageSize={reviewsPageSize}
          />

          {collection.id && len(collectionFeed) > 0 && (
            <>
              <Heading rank={2}>
                <Link to={paths.collection(collection.slug)}>
                  <SimpleIntlMessage id="discover.main_heading_collection" values={{ name: collection.name }} />
                </Link>
              </Heading>
              <DiscoverMainGamesList
                {...gamesListCommonProperties}
                {...collectionData}
                games={collectionGames}
                load={collectionLoader}
                pageSize={COLLECTION_GAMES_PAGE_SIZE}
              />
            </>
          )}

          {currentUser.id && (
            <>
              <Heading rank={2}>
                <Link to={paths.discoverSection(DISCOVER_SEC_FRIENDS)}>
                  <SimpleIntlMessage id="discover.main_heading_friends_playing" />
                </Link>
              </Heading>
              <DiscoverMainGamesList
                {...gamesListCommonProperties}
                {...friendsPlayingData}
                games={friendsPlayingGames}
                load={friendsLoader}
                pageSize={FRIENDS_PLAYING_PAGE_SIZE}
                gameCardProperties={{
                  showAddedBy: true,
                }}
              />
            </>
          )}

          {featuredGame && (
            <DiscoverMainGamePoster
              game={featuredGame}
              dispatch={dispatch}
              currentUser={currentUser}
              allRatings={allRatings}
              isPhoneSize={isPhoneSize}
              playVideoOnHitScreen
            />
          )}

          <Heading rank={2}>
            <Link to={paths.discoverSection(DISCOVER_SEC_RECENT_PAST)}>
              <SimpleIntlMessage id="discover.main_heading_noteworthy" />
            </Link>
          </Heading>
          <DiscoverMainGamesList
            {...gamesListCommonProperties}
            {...noteworthyData}
            games={noteworthyGames}
            load={noteworthyLoader}
            pageSize={NOTEWORTHY_PAGE_SIZE}
          />

          <Heading rank={2}>
            <Link to={paths.releaseDates}>
              <SimpleIntlMessage id="discover.main_heading_next_month" />
            </Link>
          </Heading>
          <DiscoverMainGamesList
            {...gamesListCommonProperties}
            {...nextMonthData}
            games={nextMonthGames}
            load={nextMonthLoader}
            pageSize={NEXT_MONTH_PAGE_SIZE}
          />

          <Heading rank={2}>
            <SimpleIntlMessage id="discover.main_heading_popular_in_wishlists" />
          </Heading>
          <DiscoverMainGamesList
            {...gamesListCommonProperties}
            {...popularInWishlistsData}
            games={popularInWishlistsGames}
            load={popularLoader}
            pageSize={POPULAR_IN_WISHLISTS_PAGE_SIZE}
          />

          {featuredGame2 && (
            <DiscoverMainGamePoster
              game={featuredGame2}
              dispatch={dispatch}
              currentUser={currentUser}
              allRatings={allRatings}
              isPhoneSize={isPhoneSize}
              playVideoOnHitScreen
            />
          )}

          {becauseCompletedGame && (
            <>
              <div className="discover-main__heading-with-subtitle">
                <div className="discover-main__heading-with-subtitle__subtitle">
                  <SimpleIntlMessage id="discover.main_subheading_because_completed" />
                </div>
                <Heading rank={2}>{becauseCompletedGame.name}</Heading>
              </div>
              <DiscoverMainGamesList
                {...gamesListCommonProperties}
                {...becauseCompletedData}
                games={becauseCompletedGames}
                load={completedLoader}
                pageSize={BECAUSE_COMPLETED_PAGE_SIZE}
              />
            </>
          )}

          {currentUser.id && (
            <>
              <Heading rank={2}>
                <SimpleIntlMessage id="discover.main_heading_new_follow" />
              </Heading>
              <DiscoverMainGamesList
                {...gamesListCommonProperties}
                {...newFollowData}
                games={newFollowGames}
                load={followLoader}
                pageSize={NEW_FOLLOW_PAGE_SIZE}
              />
            </>
          )}
        </>
      )}
    </DiscoverPage>
  );
};

DiscoverMainPage.propTypes = propTypes;
DiscoverMainPage.defaultProps = defaultProps;

const DiscoverMain = hoc(DiscoverMainPage);

export default DiscoverMain;
