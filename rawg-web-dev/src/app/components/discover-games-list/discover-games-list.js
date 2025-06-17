import cn from 'classnames';

import React from 'react';
import PropTypes from 'prop-types';
import { compose } from 'recompose';
import { connect } from 'react-redux';
import { hot } from 'react-hot-loader/root';

import get from 'lodash/get';

import cond from 'ramda/src/cond';
import T from 'ramda/src/T';
import propEq from 'ramda/src/propEq';
import propSatisfies from 'ramda/src/propSatisfies';

import './discover-games-list.styl';

import { appSizeType } from 'app/pages/app/app.types';
import currentUserType from 'app/components/current-user/current-user.types';

import GameCardMediumList from 'app/components/game-card-medium-list';
import GameCardLarge from 'app/components/game-card-large';
import GameCardMedium from 'app/components/game-card-medium';
import ListLoader from 'app/ui/list-loader';
import ModeSelector from 'app/components/mode-selector';
import DiscoverFilter from 'app/components/discover-filter';
import NoResults from 'app/pages/games/components/no-results';

import { DISCOVER_SEC_WISHLIST, DISCOVER_SEC_FRIENDS, isLibrarySection } from 'app/pages/discover/discover.sections';

import { setDiscoverDisplayMode, getDiscoverPageSize } from 'app/pages/discover/discover.actions';

import {
  MODE_SELECTOR_COLUMNS,
  MODE_SELECTOR_LIST,
  modeSelectorType,
} from 'app/components/mode-selector/mode-selector.helper';

import appHelper from 'app/pages/app/app.helper';
import passDownProps from 'tools/pass-down-props';
import onlyUpdateForKeysDeep from 'tools/only-update-for-keys-deep';
import getPagesCount from 'tools/get-pages-count';

const connectYears = cond([
  [propEq('section', DISCOVER_SEC_WISHLIST), ({ state }) => state.discover.sectionsYears.wishlist],
  [propSatisfies(isLibrarySection, 'section'), ({ state }) => state.discover.sectionsYears.library],
  [propEq('section', DISCOVER_SEC_FRIENDS), ({ state }) => state.discover.sectionsYears.friends],
  [T, ({ state }) => get(state, 'games.games.filters.years', [])],
]);

const hoc = compose(
  hot,
  connect((state, { section }) => ({
    appSize: state.app.size,
    allRatings: state.app.ratings,
    currentUser: state.currentUser,
    displayMode: state.discover.displayMode,
    years: connectYears({ state, section }),
    section,
  })),
  onlyUpdateForKeysDeep(['games', 'appSize', 'currentUser', 'displayMode', 'years', 'filterProperties.filters']),
);

const propTypes = {
  className: PropTypes.string,

  // redux connector
  years: PropTypes.arrayOf(PropTypes.object).isRequired,
  appSize: appSizeType.isRequired,
  currentUser: currentUserType.isRequired,
  dispatch: PropTypes.func.isRequired,
  displayMode: modeSelectorType.isRequired,
  allRatings: PropTypes.arrayOf(PropTypes.object).isRequired,
  section: PropTypes.string,

  // from parents
  games: PropTypes.shape({
    count: PropTypes.number,
    items: PropTypes.arrayOf(PropTypes.object),
    next: PropTypes.number,
    loading: PropTypes.bool,
    loaded: PropTypes.bool,
  }).isRequired,
  load: PropTypes.func.isRequired,
  gameCardProperties: PropTypes.oneOfType([PropTypes.object, PropTypes.func]),
  mediumGameCardProperties: PropTypes.oneOfType([PropTypes.object, PropTypes.func]),
  largeGameCardProperties: PropTypes.oneOfType([PropTypes.object, PropTypes.func]),
  showSeoPagination: PropTypes.bool,

  headRight: PropTypes.node,
  emptyMessage: PropTypes.node,
  withFilter: PropTypes.bool,
  filterProperties: PropTypes.shape(),
  clearFitlerPath: PropTypes.string,
  groupBy: PropTypes.func,
};

const defaultProps = {
  section: undefined,
  emptyMessage: undefined,
  filterProperties: undefined,
  withFilter: false,
  gameCardProperties: undefined,
  mediumGameCardProperties: undefined,
  largeGameCardProperties: undefined,
  showSeoPagination: undefined,
  headRight: undefined,
  clearFitlerPath: undefined,
  groupBy: undefined,
};

const setModeHandlerGetter = (dispatch) => ({ mode }) => () => {
  dispatch(setDiscoverDisplayMode(mode));
};

const DiscoverGamesListComponent = ({
  games,
  appSize,
  currentUser,
  dispatch,
  allRatings,
  displayMode,
  gameCardProperties,
  mediumGameCardProperties,
  largeGameCardProperties,
  load,
  section,
  showSeoPagination,

  headRight,
  emptyMessage,
  filterProperties,
  withFilter,
  years,
  clearFitlerPath,
  groupBy,

  className,
}) => {
  const { count, items, next, loading, loaded } = games;

  const pageSize = getDiscoverPageSize({ currentUser });
  const isDesktop = appHelper.isDesktopSize(appSize);
  const showColumns = isDesktop && displayMode === MODE_SELECTOR_COLUMNS;
  const showListLarge = isDesktop && displayMode === MODE_SELECTOR_LIST;
  const showListMedium = appHelper.isPhoneSize(appSize);

  const getEmptyMessage = () => {
    if (emptyMessage) {
      return emptyMessage;
    }

    return <NoResults addClearFilterLink={!isLibrarySection(section)} clearFitlerPath={clearFitlerPath} />;
  };

  const renderPhoneLayout = () => {
    const renderMediumGameCard = (game) => (
      <GameCardMedium
        key={game.id}
        className="discover__content__game-card-medium"
        appSize={appSize}
        currentUser={currentUser}
        dispatch={dispatch}
        allRatings={allRatings}
        game={game}
        showMoreButton
        {...(game.can_play || game.iframe_url ? [] : passDownProps(gameCardProperties, game))}
        {...(game.can_play || game.iframe_url ? [] : passDownProps(mediumGameCardProperties, game))}
      />
    );

    function renderGroup({ key, title, items: itemsArray }) {
      if (!itemsArray.length) {
        return null;
      }

      return (
        <React.Fragment key={key}>
          {title && <div className="discover-columns-title">{title}</div>}
          {itemsArray.map(renderMediumGameCard)}
        </React.Fragment>
      );
    }

    if (section === 'main') {
      const output = [
        {
          key: '0',
          items: [],
          title: 'Онлайн игры',
        },
        {
          key: '1',
          items: [],
          title: 'Рекомендации',
        },
      ];

      // eslint-disable-next-line no-restricted-syntax
      for (const item of items) {
        if (item.promo === 'promo') {
          output[0].items.push(item);
        } else {
          output[1].items.push(item);
        }
      }

      return output.map(renderGroup);
    }

    if (groupBy) {
      return groupBy(items).map(renderGroup);
    }

    return items.map(renderMediumGameCard);
  };

  const renderDesktopLayout = () => {
    if (showColumns) {
      return (
        <GameCardMediumList
          section={section}
          appSize={appSize}
          currentUser={currentUser}
          dispatch={dispatch}
          allRatings={allRatings}
          games={items}
          containerWidth={0}
          groupBy={groupBy}
          gameCardProperties={(game) =>
            game.can_play
              ? {}
              : {
                  showMoreButton: true,
                  ...passDownProps(gameCardProperties, game),
                  ...passDownProps(mediumGameCardProperties, game),
                }
          }
          float
        />
      );
    }

    return items.map((game) => (
      <GameCardLarge
        key={game.id}
        className="discover__content__game-card-large"
        appSize={appSize}
        currentUser={currentUser}
        dispatch={dispatch}
        allRatings={allRatings}
        game={game}
        showAboutText
        playVideoOnHitScreen
        showMoreButton
        {...(game.can_play || game.iframe_url ? [] : passDownProps(gameCardProperties, game))}
        {...(game.can_play || game.iframe_url ? [] : passDownProps(largeGameCardProperties, game))}
      />
    ));
  };

  return (
    <div className={cn('discover-games-list', className)}>
      <div className="discover-games-list__controls">
        <div className="discover-games-list__controls__left">
          {section !== 'main' && withFilter && (
            <DiscoverFilter dispatch={dispatch} enableSortByRating years={years} {...filterProperties} />
          )}
        </div>
        {/* <div className="discover-games-list__controls__right">
          {headRight}
          {section !== 'main' && (
            <ModeSelector
              className="discover-games-list__controls__right__mode-select"
              displayMode={displayMode}
              setModeHandler={setModeHandlerGetter(dispatch)}
            />
          )}
        </div> */}
      </div>
      <ListLoader
        load={load}
        count={count}
        next={next}
        loading={loading}
        pages={getPagesCount(count, pageSize)}
        showSeoPagination={showSeoPagination}
        isOnScroll
      >
        {loaded && count === 0 && getEmptyMessage()}
        {count > 0 && (showColumns || showListLarge) && renderDesktopLayout()}
        {count > 0 && showListMedium && renderPhoneLayout()}
      </ListLoader>
    </div>
  );
};

DiscoverGamesListComponent.propTypes = propTypes;
DiscoverGamesListComponent.defaultProps = defaultProps;

const DiscoverGamesList = hoc(DiscoverGamesListComponent);

export default DiscoverGamesList;
