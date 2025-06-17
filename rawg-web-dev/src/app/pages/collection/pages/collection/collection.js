/* eslint-disable camelcase, no-nested-ternary */
/* eslint-disable jsx-a11y/anchor-is-valid, no-console, react/no-danger */
/* eslint-disable sonarjs/cognitive-complexity */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { Link } from 'app/components/link';
import { denormalize } from 'normalizr';
import { hot } from 'react-hot-loader/root';
import { FormattedMessage, injectIntl } from 'react-intl';
import { scroller } from 'react-scroll';
import sanitizeHTML from 'sanitize-html';
import striptags from 'striptags';

import complement from 'ramda/src/complement';

import compareBy from 'tools/ramda/compare-by';
import getUrlWidthQuery from 'tools/get-url-with-query';
import { pageView } from 'scripts/analytics-helper';

import './collection.styl';

import get from 'lodash/get';

import Schemas from 'redux-logic/schemas';
import prepare from 'tools/hocs/prepare';
import colorHandler from 'tools/color-handler';
import denormalizeGamesArr from 'tools/redux/denormalize-games-arr';

import simpleTruncate from 'tools/string/simple-truncate';

import Heading from 'app/ui/heading';
import nameSplit from 'tools/name-split';

import { setDiscoverDisplayMode, loadDiscoverFollowings } from 'app/pages/discover/discover.actions';

import { MODE_SELECTOR_LIST } from 'app/components/mode-selector/mode-selector.helper';

import { showComment } from 'app/pages/app/app.actions';
import checkLogin from 'tools/check-login';
import Avatar from 'app/ui/avatar';
import Time from 'app/ui/time';
import {
  loadCollectionComments,
  loadCollectionCommentsReplies,
} from 'app/components/collection-feed-item-comments/collection-feed-item-comments.actions';
import DiscoverPage from 'app/ui/discover-page';
import DiscoverGamesList from 'app/components/discover-games-list';
import UserContent from 'app/ui/user-content';

import CollectionButtons from 'app/pages/collection/pages/collection/components/buttons/collection-buttons';

import { appSizeType } from 'app/pages/app/app.types';
import currentUserType from 'app/components/current-user/current-user.types';
import appHelper from 'app/pages/app/app.helper';
import paths from 'config/paths';
import config from 'config/config';

import SimpleIntlMessage from 'app/components/simple-intl-message';

// import prepareCollectionFilter from 'app/pages/collection/collection.helpers';

// import { getFiltersFromLocation } from 'app/ui/filter/filter.funcs';

import MoreButton from 'app/ui/more-button';

import locationShape from 'tools/prop-types/location-shape';
import intlShape from 'tools/prop-types/intl-shape';

import 'app/components/review-card/components/likes/likes.styl';

import prepareCollectionFilter from 'app/pages/collection/collection.helpers';
import { getFiltersQueryFromLocation } from 'app/ui/filter/filter.funcs';

import { loadCatalog } from 'app/pages/games/games.actions';

import CollectionLikeButton from 'app/pages/collection/components/like-button';

import Error404 from 'interfaces/error-404';
import {
  loadCollection,
  loadCollectionFeed,
  followCollection,
  unfollowCollection,
  loadRecommendations,
  setBackground,
  removeCollectionFeedItem,
  likeCollection,
} from '../../collection.actions';

const previewTextLength = 200;
const enableFilters = true;

const prepareFilter = (location) => prepareCollectionFilter(getFiltersQueryFromLocation(location));

const cannotGiveCakeStr = { id: 'collection.cannot-give-cake-yourself' };
const cannotGiveMore50CakesStr = { id: 'collection.cannot-give-more-50-cakes' };

@hot
@prepare(
  async ({ store, location, params = {} }) => {
    const { id } = params;
    const { query, hash } = location;
    const filters = prepareFilter(location);

    const collectionLoadedNormally = await store.dispatch(loadCollection(id));

    if (!collectionLoadedNormally) {
      throw new Error404();
    }

    if (query.comment) {
      const { id: itemId, page: itemPage } = JSON.parse(decodeURIComponent(query.item));
      const { id: commentId, page, children_page } = JSON.parse(decodeURIComponent(query.comment));

      await Promise.all([
        store.dispatch(loadCatalog(id)),
        store.dispatch(loadCollectionFeed(id, itemPage, undefined, filters)),
        store.dispatch(loadRecommendations()),
        store.dispatch(loadDiscoverFollowings()),
        store.dispatch(
          loadCollectionComments({
            collection: { id, slug: id },
            item: { id: itemId },
            page,
          }),
        ),
      ]);

      await store.dispatch(
        loadCollectionCommentsReplies({
          collection: { id, slug: id },
          item: { id: itemId },
          comment: { id: commentId },
          page: children_page || 1,
        }),
      );

      await store.dispatch(showComment(hash.replace('#', '')));
    } else {
      await Promise.all([
        store.dispatch(loadCatalog(id)),
        store.dispatch(loadCollectionFeed(id, 1, undefined, filters)),
        store.dispatch(loadRecommendations()),
        store.dispatch(loadDiscoverFollowings()),
      ]);
    }
  },
  {
    updateOn: complement(
      compareBy(({ location, params }) => ({
        filters: prepareFilter(location),
        slug: params.id,
      })),
    ),
  },
)
@connect((state) => ({
  currentUser: state.currentUser,
  collection: state.collection,
  collectionFeed: denormalize(state.collection.feed.results, Schemas.COLLECTION_FEED_ARRAY, state.entities),
  suggestedGames: denormalizeGamesArr(state, 'collection.suggestions.results'),
  appSize: state.app.size,
  platforms: state.games.platforms,
}))
@injectIntl
export default class Collection extends Component {
  static propTypes = {
    collection: PropTypes.shape().isRequired,
    collectionFeed: PropTypes.arrayOf(PropTypes.shape({})),
    currentUser: currentUserType.isRequired,
    dispatch: PropTypes.func.isRequired,
    params: PropTypes.shape().isRequired,
    location: locationShape.isRequired,
    appSize: appSizeType.isRequired,
    platforms: PropTypes.arrayOf(PropTypes.object).isRequired,
    intl: intlShape.isRequired,
  };

  static defaultProps = {
    collectionFeed: [],
  };

  sendLikesTimer = null;

  constructor(props, context) {
    super(props, context);

    const { collection } = this.props;
    const {
      id,
      likes_count: allLikesCount = 0,
      user_like: userLikesCount = 0,
      likes_users: likesUsers = 0,
    } = collection;

    this.state = {
      id,
      allLikesCount, // общее кол-во лайков
      likesUsers, // кол-во пользователей которые поставили лайки
      userLikesCount, // кол-во лайков текущего пользователя
    };
  }

  static getDerivedStateFromProps(props, state) {
    const idsChanged = props.collection.id !== state.id;

    if (idsChanged) {
      const {
        id,
        likes_count: allLikesCount = 0,
        user_like: userLikesCount = 0,
        likes_users: likesUsers = 0,
      } = props.collection;

      return { id, allLikesCount, likesUsers, userLikesCount };
    }

    return null;
  }

  componentDidMount() {
    const { location, dispatch } = this.props;
    const { query } = location;

    if (query && query.view === 'feed') {
      dispatch(setDiscoverDisplayMode(MODE_SELECTOR_LIST));
    }
  }

  loadFeed = async (pageArgument) => {
    const { dispatch, params, collection, location } = this.props;
    const { id } = params;
    const { feed } = collection;
    const { next } = feed;
    const page = pageArgument || next;
    const filters = prepareFilter(location);

    await dispatch(loadCollectionFeed(id, page, undefined, filters));
    pageView(getUrlWidthQuery(location, { page }));
  };

  follow = () => {
    const { dispatch, collection } = this.props;

    checkLogin(dispatch, () => dispatch(followCollection(collection)));
  };

  unfollow = () => {
    const { dispatch, collection } = this.props;

    dispatch(unfollowCollection(collection));
  };

  like = () => {
    const { collection, currentUser } = this.props;
    const { creator } = collection;

    if (creator.slug === currentUser.slug) {
      return;
    }

    checkLogin(this.props.dispatch, () => {
      this.setState(
        ({ allLikesCount, userLikesCount, likesUsers }) => {
          if (userLikesCount < 50) {
            return {
              allLikesCount: allLikesCount + 1,
              userLikesCount: userLikesCount + 1,
              likesUsers: userLikesCount === 0 ? likesUsers + 1 : likesUsers,
            };
          }

          return null;
        },
        () => {
          if (this.state.userLikesCount >= 50) {
            return;
          }

          if (this.sendLikesTimer) {
            clearTimeout(this.sendLikesTimer);
          }

          this.sendLikesTimer = setTimeout(this.sendLikes, 500);
        },
      );
    });
  };

  sendLikes = () => {
    const { dispatch, collection } = this.props;
    const { allLikesCount, likesUsers, userLikesCount } = this.state;

    dispatch(
      likeCollection({
        id: collection.id,
        userLikesCount,
        allLikesCount,
        likesUsers,
      }),
    );
  };

  getPageProps = () => {
    const { collection } = this.props;
    const { game_background, noindex } = collection;

    return {
      helmet: {
        title: collection.seo_title,
        description: collection.seo_description,
        keywords: collection.seo_keywords,
        image: collection.share_image,
        addProjectName: false,
        none: noindex,
      },
      art: game_background
        ? {
            image: {
              path: game_background.url,
              color: `rgba(${colorHandler.hexToRgb(game_background.dominant_color).join(',')},0.8)`,
            },
            height: '800px',
          }
        : false,
    };
  };

  getGameCardProps = (forLarge) => (game) => {
    const { dispatch, collection, appSize } = this.props;
    const feedItem = {
      id: game.feedItemId,
    };
    const isDesktop = appHelper.isDesktopSize(appSize);
    const isPhone = !isDesktop;
    const isUserCollection = this.isUserCollection();

    const setAsCollectionBgButton = isUserCollection && {
      key: 'set-collection-background-btn',
      onClick: () => {
        dispatch(setBackground(collection.id, game));
      },
      children: <SimpleIntlMessage id="shared.games_collection_background" />,
    };

    const removeFromCollectionButton = isUserCollection && {
      key: 'remove-from-collection-btn',
      onClick: () => {
        dispatch(removeCollectionFeedItem(collection.id, feedItem));
      },
      children: <SimpleIntlMessage id="collection.delete" />,
    };

    const setItemDescriptionLink = isUserCollection && {
      key: 'set-item-description-link',
      to: paths.collectionFeedItemText(collection.slug, feedItem.id),
      children: game.description ? (
        <SimpleIntlMessage id="collection.update_description" />
      ) : (
        <SimpleIntlMessage id="collection.add_description" />
      ),
    };

    const enableListMode = () => {
      dispatch(setDiscoverDisplayMode(MODE_SELECTOR_LIST));
      setTimeout(() => {
        scroller.scrollTo(`game-card-large-${game.slug}`, {
          duration: 500,
          smooth: true,
          offset: -25,
        });
      }, 300);
    };

    const hasAttachmets = game.embedData.text_attachments > 0;
    const desc = striptags(game.description);
    const showMoreButton = isDesktop && (desc.length > previewTextLength || hasAttachmets);

    const text = forLarge ? (
      <UserContent className="collection-feed-item__text collection-feed-item__text-large" content={game.description} />
    ) : (
      <div className="collection-feed-item__text collection-feed-item__text-medium">
        {isDesktop ? (
          simpleTruncate(previewTextLength, desc)
        ) : (
          <span
            dangerouslySetInnerHTML={{
              __html: game.description,
            }}
          />
        )}{' '}
        {showMoreButton && <MoreButton onClick={isDesktop ? enableListMode : undefined} />}
      </div>
    );

    return {
      showAboutText: true,
      showAboutTextAbove: isPhone,
      aboutText: text,
      showComments: false,
      showMedia: (isDesktop && !forLarge) || !hasAttachmets,
      showEmbeds: isDesktop,
      onEmbedClick: enableListMode,
      embedData: game.embedData,
      buttonsProperties: {
        moreOptionsProperties: {
          buttons: [setAsCollectionBgButton, setItemDescriptionLink, removeFromCollectionButton],
        },
      },
    };
  };

  isUserCollection = () => {
    const userId = get(this.props, 'currentUser.id');
    const creatorId = get(this.props, 'collection.creator.id');

    return userId === creatorId;
  };

  getCollectionLikeButtonTitle = () => {
    const { userLikesCount } = this.state;
    const { intl } = this.props;
    const isUserCollection = this.isUserCollection();

    if (isUserCollection) {
      return intl.formatMessage(cannotGiveCakeStr);
    }

    if (userLikesCount >= 50) {
      return intl.formatMessage(cannotGiveMore50CakesStr);
    }

    return undefined;
  };

  renderTitle() {
    const { collection } = this.props;
    const { promo } = collection;

    const e3 = config.promos.e3 && promo === 'e3';
    const gc = config.promos.gamescom && promo === 'gamescom';

    return (
      <div className="collection-title">
        {e3 && <div className="collection-title__e3-2018-promo" />}
        {gc && <div className="collection-title__gamescom-promo" />}
        <Heading className="collection-title__heading" rank={1}>
          {nameSplit(collection.seo_h1 || '', 30)}
        </Heading>
      </div>
    );
  }

  renderMeta() {
    const { collection } = this.props;
    const { created = Date.now(), creator = {}, is_private: isPrivate } = collection;
    const createdDate = new Date(created);

    return (
      <>
        <div className="collection-meta">
          <FormattedMessage
            id="collection.meta"
            values={{
              date: (
                <span className="collection-meta__value">
                  <Time date={createdDate} relative={7} />
                </span>
              ),
              name: (
                <Link to={paths.profile(creator.slug)} className="collection-meta__value">
                  {appHelper.getName(creator)}
                </Link>
              ),
            }}
          />
          <Link to={paths.profile(creator.slug)} href={paths.profile(creator.slug)}>
            <Avatar size={20} src={creator.avatar} profile={creator} />
          </Link>
        </div>
        {isPrivate && (
          <div className="collection-meta__is-private">
            <FormattedMessage id="collection.is-private" />
          </div>
        )}
      </>
    );
  }

  renderDescription() {
    const { collection } = this.props;
    const { description } = collection;

    return (
      <div
        className="collection-description"
        dangerouslySetInnerHTML={{
          __html: sanitizeHTML(description, {
            allowedTags: ['br', 'a'],
          }),
        }}
      />
    );
  }

  renderMobileButtons() {
    const { allLikesCount, userLikesCount } = this.state;
    const { dispatch, currentUser, location, appSize, collection = {} } = this.props;
    const { is_private: isPrivate } = collection;
    const isUserCollection = this.isUserCollection();

    return (
      <CollectionButtons
        dispatch={dispatch}
        currentUser={currentUser}
        location={location}
        collection={collection}
        showLikeButton={!isPrivate}
        likeButtonProperties={{
          onClick: this.like,
          clicksCount: allLikesCount,
          title: this.getCollectionLikeButtonTitle(),
          disabled: isUserCollection || userLikesCount >= 50,
          showCakeLabel: !isUserCollection && appHelper.isDesktopSize(appSize),
          asButton: true,
          smallFonts: true,
        }}
      />
    );
  }

  renderGamesList() {
    const { collection, collectionFeed = [], location, platforms } = this.props;
    const { feed } = collection;
    const { count, next, loading } = feed;

    const gameInfo = (item) => ({
      ...item.game,
      description: item.text,
      feedItemId: item.id,
      embedData: {
        text_attachments: item.text_attachments,
        text_previews: item.text_previews,
      },
    });

    const games = {
      items: collectionFeed.map(gameInfo),
      count,
      next,
      loading,
    };

    const urlBase = paths.collection(collection.slug);
    const filters = prepareFilter(location);

    return (
      <>
        <DiscoverGamesList
          load={this.loadFeed}
          mediumGameCardProperties={this.getGameCardProps(false)}
          largeGameCardProperties={this.getGameCardProps(true)}
          games={games}
          withFilter={enableFilters}
          filterProperties={
            enableFilters && {
              urlBase,
              linkable: 'withQueries',
              enableDatesFilter: false,
              enablePlatformsFilter: true,
              filters,
              platforms,
            }
          }
        />
      </>
    );
  }

  renderLikeButton() {
    const { allLikesCount, likesUsers, userLikesCount } = this.state;
    const { collection } = this.props;
    const { is_private: isPrivate } = collection;
    const isUserCollection = this.isUserCollection();

    if (isPrivate) {
      return null;
    }

    return (
      <CollectionLikeButton
        onClick={this.like}
        clicksCount={allLikesCount}
        usersCount={likesUsers}
        showCakeLabel={!isUserCollection}
        title={this.getCollectionLikeButtonTitle()}
        disabled={isUserCollection || userLikesCount >= 50}
        showUsersCount
        verticalLayout
        bigFonts
      />
    );
  }

  render() {
    const { appSize, location } = this.props;
    const { pathname } = location;

    return (
      <DiscoverPage
        pageProperties={this.getPageProps()}
        className="collection"
        pathname={pathname}
        isPhoneSize={appHelper.isPhoneSize(appSize)}
        heading={this.renderTitle()}
        headerRightContent={this.renderMobileButtons()}
      >
        {this.renderMeta()}
        {this.renderDescription()}
        {this.renderGamesList()}
        {this.renderLikeButton()}
      </DiscoverPage>
    );
  }
}
