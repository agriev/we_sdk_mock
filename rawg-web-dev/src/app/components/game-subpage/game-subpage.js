/* eslint-disable camelcase */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withRouter } from 'react-router';
import { connect } from 'react-redux';
import { injectIntl } from 'react-intl';
import { hot } from 'react-hot-loader/root';
import cn from 'classnames';

import config from 'config/config';

import defaultTo from 'lodash/defaultTo';
import isString from 'lodash/isString';
import isFunction from 'lodash/isFunction';

import equals from 'ramda/src/equals';
import cond from 'ramda/src/cond';
import T from 'ramda/src/T';

import paths from 'config/paths';
import denormalizeGame from 'tools/redux/denormalize-game';

import SubpageHeading from 'app/ui/subpage-heading';
import SubpageMenu from 'app/ui/subpage-menu';
import Breadcrumbs from 'app/ui/breadcrumbs';
import Heading from 'app/ui/heading';

import appHelper from 'app/pages/app/app.helper';
import Page from 'app/ui/page';
import Content from 'app/ui/content';

import { appSizeType, appLocaleType } from 'app/pages/app/app.types';
import currentUserType from 'app/components/current-user/current-user.types';
import locationShape from 'tools/prop-types/location-shape';
import intlShape from 'tools/prop-types/intl-shape';
import { genres as genresType } from 'app/pages/games/games.types';

import { isUgly } from 'app/pages/game/game.helper';
import gameType from 'app/pages/game/game.types';
import GameHeadMeta from 'app/ui/game-head-meta';

import './game-subpage.styl';
import 'app/pages/game/game.styl';

import SimpleIntlMessage from 'app/components/simple-intl-message/simple-intl-message';

const disabledSubpagesForCrawling = ['twitch', 'reddit', 'imgur', 'updates'];

@hot
@connect((state) => ({
  size: state.app.size,
  locale: state.app.locale,
  currentUser: state.currentUser,
  game: denormalizeGame(state),
  genres: state.app.genres,
  allRatings: state.app.ratings,
  persons: denormalizeGame(state).persons,
}))
@injectIntl
@withRouter
export default class GameSubpage extends Component {
  static propTypes = {
    section: PropTypes.string.isRequired,
    allRatings: PropTypes.arrayOf(PropTypes.object).isRequired,

    className: PropTypes.string,
    title: PropTypes.oneOfType([PropTypes.string, PropTypes.func]),
    description: PropTypes.string,
    heading: PropTypes.oneOfType([PropTypes.string, PropTypes.func]),
    backPath: PropTypes.string,
    logo: PropTypes.element,
    game: gameType.isRequired,
    persons: PropTypes.shape().isRequired,
    genres: genresType.isRequired,
    children: PropTypes.node,
    size: appSizeType.isRequired,
    locale: appLocaleType.isRequired,
    intl: intlShape.isRequired,
    dispatch: PropTypes.func.isRequired,
    location: locationShape.isRequired,
    params: PropTypes.shape().isRequired,
    helmet: PropTypes.shape(),
    currentUser: currentUserType.isRequired,
    nearHeading: PropTypes.node,
    afterHeading: PropTypes.node,
    belowHeading: PropTypes.node,
    showBreadcrumbs: PropTypes.bool,
    showMenu: PropTypes.bool,
    gameHeadMetaProperties: PropTypes.shape(),
  };

  static defaultProps = {
    className: undefined,
    title: undefined,
    description: undefined,
    heading: undefined,
    backPath: undefined,
    logo: undefined,
    children: undefined,
    nearHeading: undefined,
    afterHeading: undefined,
    belowHeading: undefined,
    helmet: undefined,

    showBreadcrumbs: true,
    showMenu: true,
    gameHeadMetaProperties: undefined,
  };

  constructor(properties, context) {
    super(properties, context);

    this.state = {
      additionalDataLoaded: false,
    };
  }

  componentDidMount() {
    import('app/pages/game/game.additional').then(({ gameHeader }) => {
      this.GameHeader = gameHeader;

      this.setState({
        additionalDataLoaded: true,
      });
    });
  }

  getPageProps = () => {
    const { intl, game = {}, title, description, location, helmet, className, section } = this.props;
    const { pathname } = location;
    const { name, seo_titles = {}, seo_descriptions = {}, image, background_image, dominant_color, slug } = game;

    const subpagePath = pathname
      .split('/')
      .slice(3)
      .join('/');

    const getTitle = cond([
      [isString, () => intl.formatMessage({ id: title }, { name })],
      [isFunction, () => title()],
      [T, () => seo_titles[section]],
    ]);

    const getDescription = cond([
      [isString, () => intl.formatMessage({ id: description }, { name })],
      [isFunction, () => description()],
      [T, () => seo_descriptions[section]],
    ]);

    return {
      helmet: {
        title: getTitle(title),
        description: getDescription(description),
        image: background_image,
        canonical: `${paths.game(slug)}/${subpagePath}`,
        none: disabledSubpagesForCrawling.includes(subpagePath),
        addProjectName: false,
        ...helmet,
      },
      className: cn('game', className),
      art: {
        image: {
          path: image || background_image,
          color: `#${dominant_color}`,
        },
        height: '500px',
        colored: true,
        ugly: isUgly(game),
      },
      sidebarProperties: {
        onlyOnPhone: false,
        offsetTop: 80,
      },
    };
  };

  renderFloatingHeader() {
    // const { game, genres, dispatch, currentUser, allRatings } = this.props;
    // const { additionalDataLoaded } = this.state;

    // if (additionalDataLoaded) {
    //   const { GameHeader } = this;
    //   return (
    //     <GameHeader game={game} genres={genres} dispatch={dispatch} currentUser={currentUser} allRatings={allRatings} />
    //   );
    // }

    return null;
  }

  renderBreadcrumbs() {
    const { game, location, showBreadcrumbs } = this.props;

    if (showBreadcrumbs) {
      const { name, slug } = game;
      const { pathname } = location;
      return <Breadcrumbs path={pathname} customNames={{ [slug]: name }} />;
    }

    return null;
  }

  renderPageHeading() {
    const { section, game, heading, logo, nearHeading, afterHeading, belowHeading, backPath } = this.props;
    const { slug, name, seo_h1s } = game;
    const pathname = defaultTo(backPath, paths.game(slug));

    const title = (
      <div className="subpage-heading__title-wrapper">
        <Heading className="subpage-heading__title" rank={1}>
          {isString(heading) && <SimpleIntlMessage id={heading} values={{ name }} />}
          {isFunction(heading) && heading()}
          {!heading && seo_h1s[section]}
          {logo}
          {afterHeading}
        </Heading>
      </div>
    );

    return (
      <>
        <SubpageHeading path={{ pathname, state: game }} title={title} nearTitle={nearHeading} />
        {belowHeading}
      </>
    );
  }

  renderHead() {
    const { size, game, gameHeadMetaProperties } = this.props;
    const { released, platforms, parent_platforms = [], playtime } = game;

    return (
      <div className="game__head">
        <GameHeadMeta
          appSize={size}
          released={released}
          platforms={platforms}
          parentPlatforms={parent_platforms}
          playtime={playtime}
          isSubpage
          {...gameHeadMetaProperties}
        />
        {this.renderPageHeading()}
      </div>
    );
  }

  renderLinks() {
    const { game, params, location, showMenu, locale } = this.props;

    if (!showMenu) {
      return null;
    }

    const { pathname } = location;
    const {
      slug,
      screenshots_count,
      movies_count,
      suggestions_count,
      collections_count,
      parent_achievements_count,
      imgur_count,
      reddit_count,
      twitch_count,
      youtube_count,
      creators_count,
      reviews_text_count,
      discussions_count,
      files_count,
      editorial_review,
    } = game;

    const { patches: patches_count = 0, demos: demos_count = 0, cheats: cheats_count = 0 } = files_count || {};

    const titles = [
      {
        name: 'game.about',
        path: paths.game(slug),
        isVisible: true,
      },
      {
        name: 'game.screenshots',
        path: paths.gameScreenshots(slug),
        isVisible: screenshots_count > 0 || movies_count > 0,
        count: screenshots_count + movies_count,
      },
      {
        name: 'game.suggestions',
        path: paths.gameSuggestions(slug),
        isVisible: suggestions_count > 0,
        count: suggestions_count,
      },
      {
        name: 'game.in_collections',
        path: paths.gameCollections(slug),
        isVisible: collections_count > 0,
        count: collections_count,
      },
      {
        name: 'game.achievements',
        path: paths.gameAchievements(slug),
        isVisible: parent_achievements_count > 0,
        count: parent_achievements_count,
      },
      {
        name: 'game.imgur',
        path: paths.gameImgur(slug),
        isVisible: config.features.imgur && imgur_count > 0,
        count: imgur_count,
      },
      {
        name: 'game.reddit',
        path: paths.gameReddit(slug),
        isVisible: reddit_count > 0,
        count: reddit_count,
      },
      {
        name: 'game.twitch',
        path: paths.gameTwitch(slug),
        isVisible: twitch_count > 0,
        count: twitch_count,
      },
      {
        name: 'game.youtube',
        path: paths.gameYoutube(slug),
        isVisible: youtube_count > 0,
        count: youtube_count,
      },
      {
        name: 'game.team',
        path: paths.gameTeam(slug),
        isVisible: creators_count > 0,
        count: creators_count,
      },
      {
        name: 'game.reviews',
        path: paths.gameReviews(slug),
        isVisible: true,
        count: reviews_text_count,
        hiddenFromRobots: reviews_text_count === 0,
        checkActive: equals(paths.review(params.id)),
      },
      {
        name: 'game.posts',
        path: paths.gamePosts(slug),
        isVisible: true,
        count: discussions_count,
        hiddenFromRobots: discussions_count === 0,
        checkActive: equals(paths.post(params.id)),
      },
      {
        name: 'game.patches',
        path: paths.gamePatches(slug),
        isVisible: patches_count > 0,
        count: patches_count,
        locale: 'ru',
        checkActive: equals(paths.gamePatch(params.id, params.patchId)),
      },
      {
        name: 'game.demos',
        path: paths.gameDemos(slug),
        isVisible: demos_count > 0,
        count: demos_count,
        locale: 'ru',
        checkActive: equals(paths.gameDemo(params.id, params.demoId)),
      },
      {
        name: 'game.cheats',
        path: paths.gameCheats(slug),
        isVisible: cheats_count > 0,
        count: cheats_count,
        locale: 'ru',
        checkActive: equals(paths.gameCheat(params.id, params.cheatId)),
      },
      {
        name: 'game.review',
        path: paths.gameReview(slug),
        isVisible: editorial_review === true,
        count: 0,
        locale: 'ru',
      },
    ].filter((item) => item.isVisible);

    return <SubpageMenu locale={locale} titles={titles} currentPath={pathname} />;
  }

  renderDesktopPage() {
    const { game, children } = this.props;
    const { id } = game;

    return (
      <>
        {this.renderFloatingHeader()}
        <Page {...this.getPageProps()} key={id}>
          <div className="game__content-wrap">
            {this.renderBreadcrumbs()}
            <Content columns="1">
              <div>{this.renderHead()}</div>
            </Content>
            <Content columns="2-1">
              <div>{children}</div>
              <div>{this.renderLinks()}</div>
            </Content>
          </div>
        </Page>
      </>
    );
  }

  renderPhonePage() {
    const pageProperties = this.getPageProps();
    const { game, children } = this.props;
    const { id } = game;

    return (
      <>
        <Page {...pageProperties} key={id}>
          <div className="game__content-wrap">
            {this.renderBreadcrumbs()}
            <Content columns="1">
              <div>
                {this.renderHead()}
                {this.renderLinks()}
                {children}
              </div>
            </Content>
          </div>
        </Page>
      </>
    );
  }

  render() {
    const { size } = this.props;
    return appHelper.isDesktopSize(size) ? this.renderDesktopPage() : this.renderPhonePage();
  }
}
