import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { compose } from 'recompose';
import { replace } from 'react-router-redux';

import get from 'lodash/get';
import startsWith from 'lodash/startsWith';

import paths from 'config/paths';

import locationChanged from 'tools/update-on/location-changed';

import env from 'config/env';
import prepare from 'tools/hocs/prepare';

import Error301 from 'interfaces/error-301';

import { setStatus } from 'app/pages/app/app.actions';
import { toggleFollow } from 'app/pages/discover/discover.actions';
import { toSingularType, toPluralType } from 'tools/urls/entity-from-url';
import locationShape from 'tools/prop-types/location-shape';

import { getDisableUserPlatformsFilter } from 'app/ui/filter/filter.funcs';

import currentUserType from 'app/components/current-user/current-user.types';
import { appTokenType } from 'app/pages/app/app.types';

import Games from '../games';
import prepareGamesFn from '../games/games.prepare';
import { getFiltersFromPathAndQuery, entityFromPath } from './games-static-filters.lib';

const getEntity = ({ state, section, slug }) => get(state, `staticFilters.${section}.${slug}`, {});

const hoc = compose(
  prepare(
    async ({ store, location }) => {
      const { dispatch } = store;
      const { pathname, query } = location;
      const state = store.getState();
      const { currentUser } = state;
      const { settings: appSettings, token: appToken } = state.app;

      const params = {
        filters: {
          ...getFiltersFromPathAndQuery(pathname, query),
          ...getDisableUserPlatformsFilter({ location, appSettings, currentUser, appToken, checkSection: false }),
        },
      };

      const { entity: entityType, section, slug } = entityFromPath(pathname);

      await prepareGamesFn({ store, params, location });

      if (entityType === 'tag' && startsWith(location.pathname, '/tags')) {
        const entity = getEntity({ state: store.getState(), section, slug });

        if (!entity.white) {
          const url = paths.utag(entity.slug);
          if (env.isClient()) {
            dispatch(replace(url));
          } else {
            throw new Error301(url);
          }
        }
      }

      if (env.isServer() && store.getState().games.games.count === 0) {
        dispatch(setStatus(404));
      }
    },
    {
      updateOn: locationChanged,
    },
  ),
  connect((state, { location }) => {
    const { pathname } = location;
    const { section: pluralEntityType, slug } = entityFromPath(pathname);
    const section = toPluralType(toSingularType(pluralEntityType));
    const { currentUser } = state;
    const { settings: appSettings, token: appToken } = state.app;

    return {
      entity: getEntity({ state, section, slug }),
      appSettings,
      currentUser,
      appToken,
    };
  }),
);

const propTypes = {
  dispatch: PropTypes.func.isRequired,
  location: locationShape.isRequired,
  entity: PropTypes.shape(),
  currentUser: currentUserType.isRequired,
  appSettings: PropTypes.shape(),
  appToken: appTokenType.isRequired,
};

const defaultProps = {
  entity: {},
};

const GamesStaticFiltersComponent = ({ dispatch, location, entity, appSettings, currentUser, appToken }) => {
  const { pathname, query } = location;
  const { entity: entityType } = entityFromPath(pathname);
  const filters = {
    ...getFiltersFromPathAndQuery(pathname, query),
    ...getDisableUserPlatformsFilter({ location, appSettings, currentUser, appToken, checkSection: false }),
  };

  const followHandler = () => toggleFollow(dispatch, entity, entityType);
  const onFollowToggle = useCallback(followHandler, [entityType, entity.slug, entity.following]);

  return (
    <Games
      filters={filters}
      params={{ filters }}
      followBtn={{
        following: entity.following || false,
        followLoading: entity.followLoading || false,
        onClick: onFollowToggle,
      }}
    />
  );
};

GamesStaticFiltersComponent.propTypes = propTypes;
GamesStaticFiltersComponent.defaultProps = defaultProps;

const GamesStaticFilters = hoc(GamesStaticFiltersComponent);

export default GamesStaticFilters;
