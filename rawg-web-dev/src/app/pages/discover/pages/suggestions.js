import React, { useCallback } from 'react';
import { push, goBack } from 'react-router-redux';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { injectIntl } from 'react-intl';
import { hot } from 'react-hot-loader/root';
import { compose } from 'recompose';
import get from 'lodash/get';
import SVGInline from 'react-svg-inline';

import '../discover.styl';

import defaultTo from 'lodash/defaultTo';

import paths from 'config/paths';
import prepare from 'tools/hocs/prepare';
import denormalizeGamesArr from 'tools/redux/denormalize-games-arr';
import denormalizeGame from 'tools/redux/denormalize-game';

import appHelper from 'app/pages/app/app.helper';
import { loadGame } from 'app/pages/game/game.actions';
import {
  loadSuggestedGames,
  setDiscoverDisplayMode,
  loadDiscoverFollowings,
} from 'app/pages/discover/discover.actions';

import DiscoverPage from 'app/ui/discover-page';
import Heading from 'app/ui/heading';

import closeIcon from 'assets/icons/close.svg';

import { appSizeType } from 'app/pages/app/app.types';
import gameType from 'app/pages/game/game.types';
import locationShape from 'tools/prop-types/location-shape';
import intlShape from 'tools/prop-types/intl-shape';

import { prepareDiscoverFilter } from 'app/components/discover-filter/discover-filter.funcs';
import { getFiltersFromLocation } from 'app/ui/filter/filter.funcs';

import DiscoverGamesList from 'app/components/discover-games-list';
import DiscoverSharing from 'app/ui/discover-sharing';
import { DISCOVER_SEC_GAMES_LIKE } from 'app/pages/discover/discover.sections';
import currentUserType from 'app/components/current-user/current-user.types';
import { loadCatalog } from 'app/pages/games/games.actions';

const section = DISCOVER_SEC_GAMES_LIKE;

const hoc = compose(
  hot,
  prepare(
    async ({ store, params, location }) => {
      if (params.slug) {
        const state = store.getState();
        const { currentUser } = state;
        const { settings: appSettings, token: appToken } = state.app;
        const filters = prepareDiscoverFilter(
          getFiltersFromLocation({ location, appSettings, currentUser, section, appToken }),
          section,
        );

        await Promise.all([
          store.dispatch(loadGame(params.slug)),
          store.dispatch(setDiscoverDisplayMode()),
          store.dispatch(loadSuggestedGames({ id: params.slug, filters })),
          store.dispatch(loadDiscoverFollowings()),
          store.dispatch(loadCatalog()),
        ]);
      }
    },
    { updateParam: 'slug' },
  ),
  connect((state, props) => {
    const path = `discover.suggestedGames.g-${props.params.slug}`;

    return {
      appSize: state.app.size,
      game: denormalizeGame(state),
      items: denormalizeGamesArr(state, `${path}.items`),
      count: get(state, `${path}.count`),
      next: get(state, `${path}.next`),
      loading: get(state, `${path}.loading`),
      platforms: state.games.platforms,
      showOnlyMyPlatforms: state.app.settings.showOnlyMyPlatforms,
      showOnlyMyPlatformsSSR: state.discover.showOnlyMyPlatformsSSR,
    };
  }),
  injectIntl,
);

const propTypes = {
  location: locationShape.isRequired,
  intl: intlShape.isRequired,
  dispatch: PropTypes.func.isRequired,
  params: PropTypes.shape().isRequired,
  appSize: appSizeType.isRequired,
  game: gameType.isRequired,
  count: PropTypes.number,
  items: PropTypes.arrayOf(PropTypes.object),
  next: PropTypes.number,
  loading: PropTypes.bool,
  showOnlyMyPlatforms: PropTypes.bool,
  showOnlyMyPlatformsSSR: PropTypes.bool,
  platforms: PropTypes.arrayOf(PropTypes.object).isRequired,
  currentUser: currentUserType.isRequired,
  appSettings: PropTypes.shape().isRequired,
};

const defaultProps = {
  next: null,
  loading: false,
  count: 0,
  items: [],
  showOnlyMyPlatformsSSR: undefined,
  showOnlyMyPlatforms: undefined,
};

const DiscoverSuggestionsComponent = ({
  location,
  intl,
  params,
  appSize,
  appSettings,
  currentUser,
  items,
  count,
  next,
  loading,
  dispatch,
  game,
  showOnlyMyPlatforms,
  showOnlyMyPlatformsSSR,
  platforms,
}) => {
  const onCloseClick = useCallback(() => {
    if (window.history.length > 2) {
      dispatch(goBack());
    } else {
      dispatch(push(paths.discover));
    }
  }, []);
  const urlBase = paths.discoverSuggestions(game.slug);
  const isPhone = appHelper.isPhoneSize(appSize);
  const isDesktop = !isPhone;
  const headingLabel = intl.formatMessage({ id: 'discover.suggestions' });
  const heading = (
    <div className="discover__game-heading">
      <span className="discover__game-label">{headingLabel}</span>
      <div className="discover__game-name">
        {game.name}
        <button className="discover__game-button" type="button" onClick={onCloseClick}>
          <SVGInline svg={closeIcon} />
        </button>
      </div>
    </div>
  );

  const desktopHeading = <Heading rank={1}>{heading}</Heading>;

  const filters = prepareDiscoverFilter(
    getFiltersFromLocation({ location, appSettings, currentUser, section }),
    section,
  );

  // const orderingFilter = JSON.stringify(filters.ordering);
  // const datesFilter = JSON.stringify(filters.dates);
  const platformsFilter = JSON.stringify(filters.platforms);
  const parentPlatformsFilter = JSON.stringify(filters.parent_platforms);

  const load = useCallback(
    () =>
      dispatch(
        loadSuggestedGames({
          id: params.slug,
          page: next,
          filters,
        }),
      ),
    [params.slug, next, platformsFilter, parentPlatformsFilter],
  );

  return (
    <DiscoverPage
      className="discover"
      pageProperties={{
        helmet: {
          title: intl.formatMessage({
            id: 'discover.title',
          }),
        },
      }}
      pathname={location.pathname}
      isPhoneSize={isPhone}
      heading={isPhone ? heading : desktopHeading}
      headerRightContent={isDesktop && <DiscoverSharing url={location.pathname} />}
    >
      <DiscoverGamesList
        load={load}
        games={{
          items,
          count,
          next,
          loading,
        }}
        withFilter
        clearFitlerPath={urlBase}
        filterProperties={{
          urlBase,
          linkable: 'withQueries',
          enableSortByRelevance: false,
          enableOrdering: false,
          enableDatesFilter: false,
          enablePlatformsFilter: false,
          enableOnlyMyPlatformsFilter: false,
          showOnlyMyPlatforms: defaultTo(showOnlyMyPlatforms, showOnlyMyPlatformsSSR),
          filters,
          platforms,
        }}
      />
    </DiscoverPage>
  );
};

DiscoverSuggestionsComponent.propTypes = propTypes;
DiscoverSuggestionsComponent.defaultProps = defaultProps;

const DiscoverSuggestions = hoc(DiscoverSuggestionsComponent);

export default DiscoverSuggestions;
