import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { withRouter } from 'react-router';
import { hot } from 'react-hot-loader/root';
import memoize from 'fast-memoize';

import get from 'lodash/get';

import complement from 'ramda/src/complement';
import compareBy from 'tools/ramda/compare-by';

import prepare from 'tools/hocs/prepare';

import { platforms as filterCollectionType, appTokenType } from 'app/pages/app/app.types';

import { entityFromPath } from 'app/pages/games-static-filters/games-static-filters.lib';
import { toggleFollow } from 'app/pages/discover/discover.actions';
import locationShape from 'tools/prop-types/location-shape';

import currentUserType from 'app/components/current-user/current-user.types';
import Game from '../game';
import Games from '../games';

import {
  prepareFiltersForGames,
  isGamesRoute,
  parseFiltersFromPath,
  getSubroutes,
  isFilterSubcatsLoaded,
  entityFromFilters,
} from './games-routes.lib';

import { getFilterSubcats } from './games-routes.selectors';
import prepareFn from './games-routes.prepare';

@hot
@connect((state, { location }) => {
  const { pathname } = location;
  const filterSubcats = getFilterSubcats({
    platforms: state.games.platforms,
    years: state.games.years,
    stores: state.app.stores,
    genres: state.app.genres,
  });

  const pathFilters = parseFiltersFromPath(pathname, filterSubcats);
  const { slug } = entityFromPath(pathname);
  const { section } = entityFromFilters(pathFilters) || {};
  const entity = slug && section ? get(state, `staticFilters.${section}.${slug}`, {}) : undefined;

  const { currentUser } = state;
  const { settings: appSettings, token: appToken } = state.app;

  return {
    filterSubcats,
    entity,
    currentUser,
    appSettings,
    appToken,
  };
})
@prepare(prepareFn, {
  updateOn: complement(
    compareBy(({ location, showOnlyMyPlatforms }) => ({
      pathname: location.pathname,
      showOnlyMyPlatforms,
    })),
  ),
})
@withRouter
export default class GamesRoutes extends PureComponent {
  static propTypes = {
    location: locationShape.isRequired,
    entity: PropTypes.shape(),
    filterSubcats: PropTypes.shape({
      platforms: PropTypes.array.isRequired,
      parent_platforms: PropTypes.array.isRequired,
      stores: filterCollectionType.isRequired,
      genres: filterCollectionType.isRequired,
      years: PropTypes.array.isRequired,
    }).isRequired,
    dispatch: PropTypes.func.isRequired,
    currentUser: currentUserType.isRequired,
    appSettings: PropTypes.shape(),
    appToken: appTokenType,
  };

  static defaultProps = {
    entity: undefined,
    appToken: undefined,
    appSettings: null,
  };

  constructor(props) {
    super(props);

    this.parseFiltersFromPath = memoize(parseFiltersFromPath);
  }

  runIfFilterSubcatsLoaded = (fn, { filterSubcats } = this.props) => isFilterSubcatsLoaded(filterSubcats) && fn();

  onFollowToggle = () => {
    const { entity, dispatch, location, filterSubcats } = this.props;
    const { pathname } = location;
    const pathFilters = this.parseFiltersFromPath(pathname, filterSubcats);
    const { type } = entityFromFilters(pathFilters);

    toggleFollow(dispatch, entity, type);
  };

  render = () =>
    this.runIfFilterSubcatsLoaded(() => {
      const { filterSubcats, location, entity, appSettings, currentUser, appToken } = this.props;
      const { query, pathname } = location;
      const pathFilters = this.parseFiltersFromPath(pathname, filterSubcats);
      const subroutes = getSubroutes(pathname);
      const filtersForGames = prepareFiltersForGames({
        pathFilters,
        queryFilters: query,
        filterSubcats,
        location,
        appSettings,
        currentUser,
        appToken,
      });

      if (isGamesRoute(pathFilters, subroutes)) {
        return (
          <Games
            params={{ filters: filtersForGames }}
            filters={filtersForGames}
            followBtn={
              entity
                ? {
                    following: entity.following || false,
                    followLoading: entity.followLoading || false,
                    onClick: this.onFollowToggle,
                  }
                : undefined
            }
          />
        );
      }

      const isFull = subroutes[1] === 'full';

      let id = subroutes[0];
      if (id) {
        id = id.replace('/full', '');
      }

      return <Game params={{ id, isFull }} />;
    });
}
