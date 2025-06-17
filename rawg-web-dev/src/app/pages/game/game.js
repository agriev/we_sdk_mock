/* eslint-disable react/no-danger, camelcase */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { injectIntl, FormattedMessage } from 'react-intl';
import { Element } from 'react-scroll';
import { withRouter } from 'react-router';
import { hot } from 'react-hot-loader/root';
import { denormalize } from 'normalizr';
import SVGInline from 'react-svg-inline';
import memoize from 'fast-memoize';
import memoizeOne from 'memoize-one';

import config from 'config/config';

import get from 'lodash/get';

import cond from 'ramda/src/cond';
import propSatisfies from 'ramda/src/propSatisfies';
import gt from 'ramda/src/gt';
import lte from 'ramda/src/lte';

import Schemas from 'redux-logic/schemas';
import denormalizeGamesArr from 'tools/redux/denormalize-games-arr';
import denormalizeGame from 'tools/redux/denormalize-game';
import SimpleIntlMessage from 'app/components/simple-intl-message';
import Breadcrumbs from 'app/ui/breadcrumbs';
import Time from 'app/ui/time';
import Heading from 'app/ui/heading';

import Footer from 'app/ui/footer';

import len from 'tools/array/len';
import getSiteUrl from 'tools/get-site-url';

import editIcon from 'assets/icons/edit.svg';
import styleVars from 'styles/vars.json';

import { removeGame, saveGameStatus } from 'app/components/game-menu-collections/game-menu.helper';
import checkLogin from 'tools/check-login';
import { showIframeModal } from 'app/ui/header/header.utils';
import { editGameStatus } from 'app/components/game-menu-collections/game-menu.actions';
import fetch from 'tools/fetch';

import appHelper from 'app/pages/app/app.helper';
import Page from 'app/ui/page';
import Content from 'app/ui/content';
import Tabs from 'app/ui/tabs';
import Tab from 'app/ui/tabs/tab';
import RatingChart from 'app/ui/rating-chart';
import RedditList from 'app/ui/reddit-list';
import ContentPlaceholder from 'app/ui/content-placeholder';
import HiddenLink from 'app/ui/hidden-link';
import { appRatingsType, appSizeType, appLocaleType } from 'app/pages/app/app.types';
import currentUserType from 'app/components/current-user/current-user.types';
import paths from 'config/paths';
import GameButtonsNew from 'app/components/game-buttons-new';
import RenderMounted from 'app/render-props/render-mounted';

import getAppContainerWidth from 'tools/get-app-container-width';
import locationShape from 'tools/prop-types/location-shape';
import intlShape from 'tools/prop-types/intl-shape';
import crop from 'tools/img/crop';

import GameAuthorization from 'app/components/game-authorization/game-authorization';
import GamesSlider from 'app/components/games-slider/games-slider';
import GamePersons from './game-persons';

import GameHeadBlock from './game/head';
import GameScreenshotsBlock from './game/screenshots';
import GameRatingsBlock from './game/ratings';
import GameOwnersBlock from './game/owners';
import GameAboutBlock from './game/about';
import GameMetaBlock from './game/meta';
import GameSystemRequirementsBlock from './game/system-requirements';
import GameAvailabilityBlock from './game/availability';
import GameSuggestionsBlock from './game/suggestions';
import GameCollectionsBlock from './game/collections';
import GameYoutubeBlock from './game/youtube';
import GameImgurBlock from './game/imgur';
import GameAchievementsBlock from './game/achievements';
import GameTwitchBlock from './game/twitch';
import GameReviewsBlock from './game/reviews';
import GamePostsBlock from './game/posts';
import GameFilesBlock from './game/files';
import GameContributorsBlock from './game/contributors';
// import GameSelectionBlock from './game/selection';
// import GameCampaignBlock from './game/campaign';

import gameType from './game.types';

import { isUgly, AggregateRating } from './game.helper';
import { loadGameSuggestions } from './game.actions';
import { genres as genresType } from '../games/games.types';

import './game.styl';

import GameIframe from './game/iframe';
import BannerAdfox from '../app/components/banner-adfox';
import GameBookmarkBanner from './game/bookmark-banner';
import NotSupportedBanner from './game/not-supported-banner';

const getGame = ({ location, game }) => {
  const gameFromLocation = location.state || {};

  return len(game, 'name') === 0 && Object.keys(gameFromLocation).length > 0 ? gameFromLocation : game;
};

const getClipByWidth = cond([
  [propSatisfies(gt(500), 'width'), ({ clips }) => clips['320']],
  [propSatisfies(gt(1000), 'width'), ({ clips }) => clips['640']],
  [propSatisfies(lte(1000), 'width'), ({ clips }) => clips.full],
]);

const connector = (state) => ({
  firstPage: state.app.firstPage,
  ratings: state.app.ratings,
  genres: state.app.genres,
  size: state.app.size,
  locale: state.app.locale,
  isSpider: state.app.request.isSpider,
  currentUser: state.currentUser,
  game: denormalizeGame(state),
  suggestedGames: denormalizeGamesArr(state, 'game.suggestions.results'),
  personsItems: denormalize(state.game.persons.results, Schemas.PERSON_ARRAY, state.entities),
  host: state.app.request.headers.host,
  gamesSlider: get(state, 'discover.slider'),
  app: state.app,
});

const gamePropertyTypes = {
  appSize: PropTypes.string,
  game: gameType.isRequired,
  ratings: appRatingsType.isRequired,
  genres: genresType.isRequired,
  size: appSizeType.isRequired,
  locale: appLocaleType.isRequired,
  isSpider: PropTypes.bool.isRequired,
  currentUser: currentUserType.isRequired,
  dispatch: PropTypes.func.isRequired,
  intl: intlShape.isRequired,
  location: locationShape.isRequired,
  suggestedGames: PropTypes.arrayOf(PropTypes.shape()).isRequired,
  personsItems: PropTypes.arrayOf(PropTypes.shape()).isRequired,
  host: PropTypes.string.isRequired,
  firstPage: PropTypes.bool.isRequired,
  gamesSlider: PropTypes.array,
};

const videoEnabled = false;

@hot
@injectIntl
@connect(connector)
@withRouter
export default class Game extends Component {
  static propTypes = gamePropertyTypes;

  constructor(props, context) {
    super(props, context);

    this.openViewer = memoize(this.openViewer);
    this.getTabsBackground = memoizeOne(this.getTabsBackground);

    this.state = {
      tab: 'reviews',
      viewerVisible: false,
      additionalDataLoaded: false,
      oldGameId: undefined,
      activeSection: 'about',
      gameInViewport: true,
      isPWAMode: false,
      isMounted: false,
      customIframeParams: '',
    };
  }

  async componentDidMount() {
    document.addEventListener('game-in-viewport', this.onGameInViewport);

    this.setState({
      isMounted: true,
    });

    if (!this.props.firstPage) {
      window.scrollTo(0, 0);
    }

    import('./game.additional').then(({ gameHeader, gameViewer }) => {
      this.GameHeader = gameHeader;
      this.GameViewer = gameViewer;

      this.setState({
        additionalDataLoaded: true,
      });
    });

    const { game } = this.props;

    if (game.can_play || game.iframe_url) {
      const params = new URLSearchParams(this.props.location.search);

      let customIframeParams = '';

      try {
        customIframeParams = params.get('params') || '';

        if (customIframeParams) {
          customIframeParams = atob(customIframeParams);

          const newParams = new URLSearchParams(customIframeParams);
          customIframeParams = new URLSearchParams('');

          // eslint-disable-next-line no-restricted-syntax
          for (const key of ['player_id', 'game_sid', 'guest', 'auth_key']) {
            customIframeParams.set(key, newParams.get(key));
          }

          customIframeParams = customIframeParams.toString();
        }
      } catch {
        //
      }

      let sessionGames = sessionStorage.getItem('games');

      if (typeof sessionGames === 'string') {
        try {
          sessionGames = JSON.parse(sessionGames);
        } catch (error) {
          sessionGames = {};
        }
      } else {
        sessionGames = {};
      }

      if (!sessionGames[game.slug]) {
        fetch(`/api/games/${game.id}/plays`, {
          method: 'POST',
          state: this.props,
        });

        sessionGames[game.slug] = true;
      }

      sessionStorage.setItem('games', JSON.stringify(sessionGames));

      this.setState({
        customIframeParams,
        isPWAMode: params.get('source') === 'pwa',

        tab: 'posts',
      });
    }
  }

  componentDidUpdate(previousProperties) {
    const oldGame = getGame(previousProperties);
    const newGame = getGame(this.props);

    if (oldGame.id && oldGame.id !== newGame.id) {
      window.scrollTo(0, 0);
    }
  }

  componentWillUnmount() {
    document.removeEventListener('game-in-viewport', this.onGameInViewport);
  }

  onGameInViewport = (event) => {
    this.setState((state) => {
      return {
        ...state,
        gameInViewport: event.detail,
      };
    });
  };

  static getDerivedStateFromProps(props, state) {
    if (!props.location) {
      return null;
    }

    const propsGame = getGame(props);

    if (state.oldGameId !== propsGame.id) {
      return {
        oldGameId: propsGame.id,
        viewerVisible: false,
      };
    }

    return null;
  }

  setActiveSection = (activeSection) => {
    this.setState({ activeSection });
  };

  closeViewer = () => {
    this.setState({
      viewerVisible: false,
    });
  };

  openViewer = (content, index) => (event) => {
    event.preventDefault();

    this.setState({
      viewerVisible: true,
      viewerContent: content,
      viewerIndex: index,
    });
  };

  showTab = (tab) => {
    this.setState({ tab });
  };

  getTabsBackground = (background_image_additional, visible) => ({
    backgroundImage:
      background_image_additional && visible
        ? `
        radial-gradient(ellipse closest-side at center, transparent, ${styleVars.mainBGColor}),
        url('${background_image_additional.replace('/media/', '/media/resize/1280/-/')}')
      `
        : '',
  });

  loadSuggestedGames = (pageSize) => {
    const { game, dispatch } = this.props;
    const {
      slug,
      suggestions: { next },
    } = game;

    return dispatch(loadGameSuggestions(slug, next, pageSize, !!(game.iframe_url || game.can_play)));
  };

  getGameVideo = (game) => {
    const { host } = this.props;
    const width = getAppContainerWidth();
    const clips = get(game, 'clip.clips');

    if (videoEnabled && clips && appHelper.isStageWebsite(host)) {
      return getClipByWidth({ width, clips });
    }

    return undefined;
  };

  getPageProps = (game) => {
    const {
      og_title,
      og_description,
      seo_title: title,
      seo_description: description,
      seo_keyword: keywords,
      image,
      background_image = '',
      dominant_color,
      slug,
      persons: { results: persons } = {},
    } = game;

    const video = this.getGameVideo(game);

    let icons = [72, 96, 144, 192];

    // eslint-disable-next-line no-plusplus
    for (let i = 0; i < icons.length; i++) {
      if (!background_image) {
        break;
      }

      const iconSize = icons[i];
      const imageType = background_image.split('.').pop();

      icons[i] = {
        src: crop(iconSize, background_image),
        type: `image/${imageType}`,
        sizes: `${iconSize}x${iconSize}`,
      };
    }

    icons = icons.filter((icon) => typeof icon === 'object');

    const helmet = {
      addProjectName: false,
      title,
      description,
      keywords,
      image: background_image,
      canonical: paths.game(slug),
    };

    if (game.can_play || game.iframe_url) {
      helmet.ogTitle = og_title;
      helmet.ogDescription = og_description;

      helmet.favicon = background_image;
      // eslint-disable-next-line prefer-destructuring
      helmet.appleTouchIcons = icons;

      let start_url = new URL(`/games/${game.slug}`, config.clientAddress.ru);

      let iframeParams = new URL(game.iframe_url).search;

      try {
        iframeParams =
          typeof window !== 'undefined' ? btoa(iframeParams) : Buffer.from(iframeParams).toString('base64');
      } catch (error) {
        iframeParams = '';
      }

      start_url.searchParams.set('params', iframeParams);
      start_url.searchParams.set('source', 'pwa');

      start_url = start_url.toString();

      const manifest = JSON.stringify({
        display: 'standalone',
        name: game.name,
        start_url,
        icons,
      });

      helmet.manifest = `data:application/manifest+json,${manifest}`;
    }

    let art = {
      image: {},
      colored: false,
    };

    if (!game.iframe_url) {
      art = {
        image: {
          path: image || background_image,
          color: `#${dominant_color}`,
        },
        height: video ? '56.25vw' : '500px',
        colored: true,
        ugly: isUgly(game),
        video,
      };
    }

    return {
      persons,
      helmet,
      className: 'game',
      art,

      sidebarProperties: {
        onlyOnPhone: false,
        offsetTop: 80,
      },

      attrs: {
        itemScope: true,
        itemType: 'http://schema.org/VideoGame',
      },
    };
  };

  isFullGame() {
    return this.props.location.pathname.endsWith('/full');
  }

  renderSemanticMeta = (game) => {
    const { personsItems, locale } = this.props;
    const image = game.image || game.background_image;
    const { slug, persons } = game;
    const siteUrl = getSiteUrl(locale);

    return (
      <div>
        {image && <meta itemProp="image" content={image} />}
        <meta itemProp="applicationCategory" content="Game" />
        <meta itemProp="url" content={`${siteUrl}${paths.game(slug)}`} />
        <meta itemProp="discussionUrl" content={`${siteUrl}${paths.gameReviews(slug)}`} />
        <AggregateRating game={game} />
        {persons &&
          Array.isArray(personsItems) &&
          personsItems.length > 0 &&
          personsItems.map((person) => (
            <div key={person.id} itemProp="creator" itemScope itemType="http://schema.org/Person">
              <meta itemProp="name" content={person.name} />
              <meta itemProp="url" content={`${siteUrl}${paths.creator(person.slug)}`} />
              <meta itemProp="image" content={person.image || person.image_background} />
            </div>
          ))}
      </div>
    );
  };

  renderHead = (game) => {
    const { size } = this.props;
    const { description_short, name, released, platforms, parent_platforms, playtime, promo } = game;

    const isOnline = !!(game.can_play || game.iframe_url);

    return (
      <GameHeadBlock
        short_description={description_short}
        size={size}
        name={name}
        released={isOnline ? '' : released}
        platforms={isOnline ? [] : platforms}
        parent_platforms={parent_platforms}
        playtime={playtime}
        promo={promo}
        plays={game.plays}
      />
    );
  };

  renderAuthorization = (game) => {
    const { currentUser = {} } = this.props;
    const { iframe_url, name } = game;

    if (currentUser.id) {
      return null;
    }

    if (iframe_url) {
      return <GameAuthorization name={name} />;
    }

    return null;
  };

  renderBoomarkBanner = (game) => {
    const { size } = this.props;

    if (!game.iframe_url) {
      return null;
    }

    // if (currentUser.id > 0) {
    //   return null;
    // }

    return <GameBookmarkBanner isFloating={appHelper.isPhoneSize(size)} game={game} size={size} />;
  };

  renderGameIframe = (game) => {
    const { currentUser, size } = this.props;

    const { screenshots, name, id } = game;
    let { iframe_url } = game;

    if (!iframe_url) {
      return null;
    }

    const cover = (screenshots.results || [])[0] || {};

    const INVITE_PARAM_KEY = 'invite';

    if (typeof window !== 'undefined') {
      const locationParams = new URLSearchParams(window.location.search);

      if (locationParams.has(INVITE_PARAM_KEY)) {
        iframe_url = new URL(iframe_url);
        iframe_url.searchParams.set(INVITE_PARAM_KEY, locationParams.get(INVITE_PARAM_KEY));

        iframe_url = iframe_url.toString();
      }
    }

    return (
      <>
        <GameIframe
          authDelay={{
            desktop: game.desktop_auth_delay,
            mobile: game.mobile_auth_delay,
          }}
          currentUser={currentUser}
          cover={cover.image}
          adfox={game.adfox ? game.adfox.results : []}
          size={size}
          game={game}
          iframeSrc={iframe_url}
          name={name}
          id={id}
          banner={this.renderBoomarkBanner(game)}
          pwaMode={this.state.isPWAMode || this.isFullGame()}
          customParams={this.state.customIframeParams}
        />
      </>
    );
  };

  renderScreenshots = (game) => {
    const { slug, screenshots, movies, name, clip } = game;

    return (
      <GameScreenshotsBlock
        openViewer={this.openViewer}
        screenshots={screenshots}
        movies={movies}
        slug={slug}
        clip={clip}
        name={name}
      />
    );
  };

  renderEditBtn = (game) => {
    const { locale } = this.props;
    const { slug, updated } = game;

    if (locale !== 'en') {
      return null;
    }

    return (
      <>
        <HiddenLink className="game__edit-button" to={paths.gameEditBasic(slug)} rel="nofollow">
          <SVGInline svg={editIcon} />
          <SimpleIntlMessage id="game.edit_btn" />
        </HiddenLink>
        {updated && (
          <div className="game__edit__last-modified-str">
            <FormattedMessage
              id="game.last_modified"
              values={{
                time: <Time date={updated} />,
              }}
            />
          </div>
        )}
      </>
    );
  };

  renderAbout(game) {
    const { locale, isSpider } = this.props;
    const { slug, description, loading, review, editorial_review } = game;
    const descriptionLength = len(game, 'description');

    return loading === false || descriptionLength > 0 ? (
      <GameAboutBlock
        locale={locale}
        gameSlug={slug}
        description={description}
        review={get(review, 'text')}
        editorialReview={editorial_review}
        isSpider={isSpider}
      />
    ) : (
      <ContentPlaceholder rows={10} />
    );
  }

  renderAchievements(game) {
    const { slug, achievements, name } = game;

    return <GameAchievementsBlock slug={slug} achievements={achievements} name={name} />;
  }

  renderAvailability(game) {
    const { dispatch, currentUser } = this.props;
    const { stores } = game;

    if (len(stores) === 0) return null;

    return (
      <GameAvailabilityBlock stores={stores} gameId={game.id} dispatch={dispatch} currentUserId={currentUser.id} />
    );
  }

  renderContributors(game) {
    if (game.iframe_url) {
      return null;
    }

    const { dispatch, currentUser } = this.props;
    const { contributors } = game;

    if (!contributors || len(contributors.results) === 0) return null;

    return (
      <GameContributorsBlock
        contributors={contributors.results}
        gameId={game.id}
        dispatch={dispatch}
        currentUserId={currentUser.id}
      />
    );
  }

  renderButtons(game) {
    const { size, currentUser, dispatch } = this.props;

    return (
      <GameButtonsNew
        className="game__buttons"
        appSize={size}
        game={game}
        currentUser={currentUser}
        dispatch={dispatch}
      />
    );
  }

  renderCharts(game) {
    const { ratings, genres } = this.props;
    const { rating_top, reviews_count = 0, charts } = game;

    return (
      <RatingChart
        ratingTop={rating_top}
        reviewsCount={reviews_count}
        allRatings={ratings}
        charts={charts}
        genres={genres}
      />
    );
  }

  renderCollections(game) {
    const { slug, collections, name } = game;

    return <GameCollectionsBlock slug={slug} collections={collections} name={name} />;
  }

  renderImgur(game) {
    const { slug, imgur, name } = game;

    if (config.features.imgur) {
      return <GameImgurBlock slug={slug} imgur={imgur} name={name} openViewer={this.openViewer} />;
    }

    return null;
  }

  renderFiles(game) {
    const { locale } = this.props;
    const { slug, files_count } = game;
    const { patches: patchesCount = 0, demos: demosCount = 0, cheats: cheatsCount = 0 } = files_count || {};

    return (
      <GameFilesBlock
        locale={locale}
        gameSlug={slug}
        cheatsCount={cheatsCount}
        demosCount={demosCount}
        patchesCount={patchesCount}
      />
    );
  }

  renderMeta(game) {
    return (
      <GameMetaBlock
        platforms={game.platforms}
        metacritic={game.metacritic}
        developers={game.developers}
        genres={game.genres}
        tags={game.tags}
        publishers={game.publishers}
        released={game.can_play || game.iframe_url ? '' : game.released}
        esrb_rating={game.esrb_rating}
        website={game.website}
        tba={game.tba}
        additions={game.additions}
        gameSeries={game.gameSeries}
        parents={game.parents}
      />
    );
  }

  renderOwners(game) {
    const { owners, id, name, slug, user_review, reviews_count } = game;

    return (
      <GameOwnersBlock
        id={id}
        name={name}
        slug={slug}
        owners={owners}
        user_review={user_review}
        reviews_count={reviews_count}
      />
    );
  }

  renderRatings = (game) => {
    const { currentUser, ratings: allRatings, dispatch } = this.props;
    const { id, name, slug, reviews_count, ratings, user_review, reviews } = game;

    return (
      <GameRatingsBlock
        reviews={reviews}
        dispatch={dispatch}
        id={id}
        name={name}
        slug={slug}
        reviews_count={reviews_count}
        user_review={user_review}
        ratings={ratings}
        allRatings={allRatings}
        currentUserId={currentUser.id}
      />
    );
  };

  renderReddit(game) {
    const { size } = this.props;
    const { slug, reddit, name } = game;
    const { results, count } = reddit || {};

    if (len(results) === 0) return null;

    return <RedditList size={size} titleLink={paths.gameReddit(slug)} count={count} results={results} name={name} />;
  }

  renderSuggestions(game) {
    const { dispatch, currentUser, suggestedGames, size, ratings: allRatings } = this.props;
    const { iframe_url, can_play, slug, suggestions, name } = game;

    return (
      <GameSuggestionsBlock
        slug={slug}
        name={name}
        suggestions={suggestions}
        dispatch={dispatch}
        currentUser={currentUser}
        suggestedGames={suggestedGames}
        load={this.loadSuggestedGames}
        appSize={size}
        allRatings={allRatings}
        isOnline={!!(iframe_url || can_play)}
      />
    );
  }

  renderSystemRequirements(game) {
    const { platforms } = game;

    if (game.iframe_url) {
      return null;
    }

    return <GameSystemRequirementsBlock platforms={platforms} />;
  }

  renderTabs() {
    const game = getGame(this.props);
    const { tab } = this.state;
    const { ratings, dispatch, intl, size } = this.props;
    const { id, name, slug, reviews, posts, background_image_additional } = game;

    return (
      <RenderMounted>
        {({ visible, onChildReference }) => (
          <div ref={(reference) => onChildReference(reference)} className="game__tabs-content">
            {!game.iframe_url && (
              <div
                className="game__tabs-background"
                style={this.getTabsBackground(background_image_additional, visible)}
              />
            )}

            <Element name="reviews" />
            <Heading className="game__tabs__title" rank={2}>
              {intl.formatMessage({ id: 'game.reviews_and_comments' }, { name })}
            </Heading>

            <Tabs className="game__tabs" centred={false}>
              {['reviews', 'posts'].map((t) => (
                <Tab
                  className="game__tab"
                  counter={get(game, `[${t}].count`, 0)}
                  active={t === tab}
                  onClick={() => this.showTab(t)}
                  key={t}
                >
                  <FormattedMessage id={`game.${t}`} />
                </Tab>
              ))}
            </Tabs>

            {tab === 'reviews' && (
              <GameReviewsBlock
                appSize={size}
                dispatch={dispatch}
                intl={intl}
                game={game}
                reviews={reviews}
                ratings={ratings}
                compact
              />
            )}

            {tab === 'posts' && (
              <GamePostsBlock dispatch={dispatch} intl={intl} id={id} name={name} slug={slug} posts={posts} />
            )}
          </div>
        )}
      </RenderMounted>
    );
  }

  renderSeoLinks() {
    return (
      <div className="game__seo-links">
        <div className="game__seo-links__wrap">
          <h2>Наши друзья:</h2>
          <ul>
            <li>
              <a
                target="_blank"
                rel="noopener noreferrer"
                href="http://kanobu.ru/?utm_source=ag&utm_medium=footer&utm_campaign=friends"
              >
                «Канобу»
              </a>
              &nbsp;— развлекательный портал о кино, сериалах, играх, музыке и технологиях
            </li>
            <li>
              <a
                target="_blank"
                rel="noopener noreferrer"
                href="http://www.igromania.ru/?utm_source=ag&utm_medium=footer&utm_campaign=friends"
              >
                «Игромания»
              </a>
              &nbsp;— новости, статьи и видео об играх, железе и не только
            </li>

            <li>
              Если у вас есть онлайн-игры, которые вы хотите разместить на ag.ru и поделиться с большой аудиторией
              «Игромании» и «Канобу»&nbsp;—&nbsp;
              <a target="_blank" rel="noopener noreferrer" href="mailto:join@ag.ru">
                пишите на почту
              </a>
            </li>
          </ul>
        </div>
      </div>
    );
  }

  renderTwitch(game) {
    const { slug, twitch, name } = game;

    return <GameTwitchBlock slug={slug} name={name} twitch={twitch} openViewer={this.openViewer} />;
  }

  renderViewer() {
    const { viewerVisible, viewerContent, viewerIndex = 0, additionalDataLoaded } = this.state;
    const { GameViewer } = this;

    if (!viewerVisible || !additionalDataLoaded) return null;

    return <GameViewer content={viewerContent} activeIndex={viewerIndex} onClose={this.closeViewer} />;
  }

  renderYoutube(game) {
    const { slug, youtube, youtube_count, name } = game;

    return <GameYoutubeBlock youtube={youtube} youtube_count={youtube_count} slug={slug} name={name} />;
  }

  renderPersons(game) {
    const { size, personsItems, locale } = this.props;
    const { slug, persons, creators_count, name } = game;

    const fullPresons = { ...persons, results: personsItems };

    return (
      <GamePersons
        persons={fullPresons}
        size={size}
        slug={slug}
        creators_count={creators_count}
        name={name}
        appLocale={locale}
      />
    );
  }

  renderFloatingHeader(game) {
    // const { dispatch, currentUser, ratings: allRatings, genres } = this.props;
    // const { additionalDataLoaded, activeSection } = this.state;

    // let forceVisible;

    // if (game.iframe_url) {
    //   forceVisible = !this.state.gameInViewport;
    // }

    // if (additionalDataLoaded) {
    //   const { GameHeader } = this;
    //   return (
    //     <GameHeader
    //       game={game}
    //       dispatch={dispatch}
    //       activeSection={activeSection}
    //       currentUser={currentUser}
    //       allRatings={allRatings}
    //       genres={genres}
    //       isMainPage
    //       forceVisible={forceVisible}
    //     />
    //   );
    // }

    return null;
  }

  renderBreadcrumbs(game) {
    const {
      location: { pathname },
      size,
    } = this.props;

    const { name, slug } = game;

    return (
      <>
        <Breadcrumbs
          path={pathname}
          customNames={{ [slug]: name }}
          style={appHelper.isPhoneSize(size) ? { marginBottom: 0 } : undefined}
        >
          {/* {!appHelper.isPhoneSize(size) && (can_play || iframe_url) ? (
          <button
            style={{ marginBottom: '-32px' }}
            className="game__fullscreen"
            onClick={this.goFullscreen}
            type="button"
          >
            <SVGInline svg={fullscreeenIcon} />
            <span>Во весь экран</span>
          </button>
        ) : null} */}
        </Breadcrumbs>
      </>
    );
  }

  renderSelection() {
    // return <GameSelectionBlock />;
    return null;
  }

  renderSectionOnline() {
    const { size } = this.props;

    if (this.props.gamesSlider.length === 0) {
      return null;
    }

    return (
      <div className="game-section game-section--online" key={this.props.gamesSlider.length}>
        <span className="game-section__title">Играть онлайн</span>
        <GamesSlider inline isPhoneSize={appHelper.isPhoneSize(size)} items={this.props.gamesSlider} />
      </div>
    );
  }

  renderDesktopPage() {
    const game = getGame(this.props);

    return (
      <div className="game__content-wrap">
        {game.can_play || game.iframe_url ? null : this.renderBreadcrumbs(game)}
        {this.renderHead(game)}
        <div className="game-content-columns">
          <div>
            {this.renderSemanticMeta(game)}
            {this.renderButtons(game)}
            {this.renderCharts(game)}
            {this.renderRatings(game)}
            {this.renderOwners(game)}
            {this.renderAbout(game)}
            {!game.iframe_url && (
              <div style={{ marginTop: '32px' }}>
                <BannerAdfox
                  key={this.props.location.pathname + this.props.appSize}
                  appSize={this.props.appSize}
                  type="game_inpage_desktop"
                />
              </div>
            )}
            {this.renderFiles(game)}
            {this.renderMeta(game)}
            {this.renderSystemRequirements(game)}
          </div>
          <div>
            {this.renderScreenshots(game)}
            {this.renderEditBtn(game)}
            {this.renderAvailability(game)}
            {/* {this.renderContributors(game)} */}
            {this.renderCollections(game)}
            {this.renderSelection()}
            {!game.iframe_url && (
              <div
                style={{
                  marginTop: '32px',
                  position: 'sticky',
                  top: '32px',
                  display: 'flex',
                  justifyContent: 'center',
                }}
              >
                <BannerAdfox
                  key={this.props.location.pathname + this.props.appSize}
                  appSize={this.props.appSize}
                  type="300x600"
                />
              </div>
            )}
          </div>
        </div>
        <div>
          {this.renderSectionOnline(game)}
          {!game.iframe_url && (
            <div style={{ marginTop: '32px' }}>
              <BannerAdfox
                key={this.props.location.pathname + this.props.appSize}
                appSize={this.props.appSize}
                type="after_article_desktop"
              />
            </div>
          )}
          {this.renderSuggestions(game)}
          {this.renderYoutube(game)}
          {this.renderPersons(game)}
          {this.renderImgur(game)}
          {this.renderAchievements(game)}
          {this.renderReddit(game)}
          {this.renderTwitch(game)}
          {this.renderTabs(game)}
          {this.renderSeoLinks()}
        </div>
        {this.renderViewer(game)}
      </div>
    );
  }

  renderPhonePage() {
    const game = getGame(this.props);
    const isHaveGame = !!game.iframe_url;
    const video = this.getGameVideo(game);
    const pagePropertiesArgument = this.getPageProps(game);

    const pageProperties = {
      ...pagePropertiesArgument,
      art: {
        ...pagePropertiesArgument.art,
        height: video ? '56.25vw' : '300px',
      },
    };

    const { isPWAMode } = this.state;
    if (isHaveGame && (isPWAMode || this.isFullGame())) {
      return this.renderGameIframe(game);
    }

    return (
      <>
        <Content columns="1">
          {this.renderSemanticMeta(game)}
          {isHaveGame && this.renderAuthorization(game)}
          {this.renderScreenshots(game)}
          {this.renderButtons(game)}
          {this.renderEditBtn(game)}
          {this.renderCharts(game)}
          {this.renderRatings(game)}
          {this.renderOwners(game)}
          {this.renderAbout(game)}
          {!game.iframe_url && (
            <div style={{ marginTop: '32px' }}>
              <BannerAdfox
                key={this.props.location.pathname + this.props.appSize}
                appSize={this.props.appSize}
                type="game_inpage_mobile"
              />
            </div>
          )}
          {this.renderFiles(game)}
          {this.renderMeta(game)}
          {this.renderSystemRequirements(game)}
          {this.renderAvailability(game)}
          {/* {this.renderContributors(game)} */}
          {this.renderSectionOnline(game)}
          {!game.iframe_url && (
            <BannerAdfox
              key={this.props.location.pathname + this.props.appSize}
              appSize={this.props.appSize}
              type="after_article_mobile"
            />
          )}
          {this.renderSuggestions(game)}
          {this.renderCollections(game)}
          {this.renderSelection()}
          {this.renderYoutube(game)}
          {this.renderPersons(game)}
          {this.renderImgur(game)}
          {this.renderAchievements(game)}
          {this.renderReddit(game)}
          {this.renderTwitch(game)}
          {this.renderTabs(game)}
          {this.renderSeoLinks()}
        </Content>
        {this.renderViewer(game)}
      </>
    );
  }

  render() {
    const { currentUser, dispatch, game, size } = this.props;
    const { isPWAMode } = this.state;

    const isHaveGame = !!game.iframe_url;

    if (isPWAMode || this.isFullGame()) {
      return this.renderGameIframe(game);
    }

    function onGameUpdate() {
      if (currentUser.id) {
        return saveGameStatus(dispatch, game);
      }

      showIframeModal({ auth: true });
    }

    return (
      <div style={{ display: this.state.isMounted ? 'block' : 'none' }}>
        {appHelper.isDesktopSize(size) && this.renderFloatingHeader(game)}

        <Page {...this.getPageProps(game)} key={game.id}>
          {isHaveGame && appHelper.isPhoneSize(size) && !game.play_on_mobile && (
            <>
              {/* <GameBookmarkBanner size={appHelper.isPhoneSize(size)} /> */}
              <NotSupportedBanner game={game} onGameUpdate={onGameUpdate} />
            </>
          )}
          {/* {appHelper.isPhoneSize(size) && this.renderBreadcrumbs(game)} */}
          {appHelper.isPhoneSize(size) && this.renderHead(game)}
          {isHaveGame && this.renderGameIframe(game)}
          {appHelper.isDesktopSize(size) ? this.renderDesktopPage() : this.renderPhonePage()}
        </Page>

        <Footer className="game__footer" />
      </div>
    );
  }
}
