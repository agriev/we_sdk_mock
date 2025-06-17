import React, { Component } from 'react';
import { replace } from 'react-router-redux';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { injectIntl } from 'react-intl';

import get from 'lodash/get';

import prepare from 'tools/hocs/prepare';
import { return404IfEmptyPage } from 'app/pages/app/app.actions';

import currentUserTypes from 'app/components/current-user/current-user.types';
import { platforms as appPlatformsType, appSizeType } from 'app/pages/app/app.types';
import locationShape from 'tools/prop-types/location-shape';
import intlShape from 'tools/prop-types/intl-shape';

import paths from 'config/paths';
import { prepareFilter } from 'app/ui/filter/filter.funcs';
import Loading2 from 'app/ui/loading-2';

import { GAME_ALL_STATUSES } from 'app/pages/game/game.types';

import { loadProfileGamesByStatus, gameStatusChanged } from 'app/pages/profile/profile.actions';
import { isCurrentUser, prepareQuery } from 'app/pages/profile/profile-games/profile-games.helper';

import ImportSearchWithInfo from 'app/ui/input-search-with-info';

import Games from './components/games';
import FilterWrapper from './components/filter-wrapper';
import EmptyState from './components/empty-state';

import './profile-games.styl';

const propTypes = {
  profile: PropTypes.shape().isRequired,
  platforms: appPlatformsType.isRequired,
  size: appSizeType.isRequired,
  currentUser: currentUserTypes.isRequired,
  dispatch: PropTypes.func.isRequired,
  location: locationShape.isRequired,
  params: PropTypes.shape().isRequired,
  route: PropTypes.shape().isRequired,
  stores: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  allRatings: PropTypes.arrayOf(PropTypes.object).isRequired,
  intl: intlShape.isRequired,
};

@prepare(
  async ({ store, params = {}, location }) => {
    const { id } = params;
    const {
      query: { filter: filterArgument, search },
      pathname,
    } = location;
    const tab = pathname.split('/').slice(-1)[0];
    const handleActionsForCheck = (wishlistAction, ...libraryActions) =>
      return404IfEmptyPage(store.dispatch)(tab === 'wishlist' ? [wishlistAction] : libraryActions);

    const filter = prepareFilter(typeof filterArgument !== 'object' ? {} : filterArgument);

    const withStatus = (status) => ({ ...filter, statuses: [status] });
    const loadGamesByStatus = (status) =>
      store.dispatch(loadProfileGamesByStatus({ id, filter: withStatus(status), search }));

    await Promise.all(GAME_ALL_STATUSES.map(loadGamesByStatus)).then((r) => handleActionsForCheck(r.values));
  },
  {
    updateParam: 'id',
    loading: false,
  },
)
@connect((state) => ({
  platforms: state.app.platforms,
  size: state.app.size,
  currentUser: state.currentUser,
  profile: state.profile,
  stores: state.app.stores,
  allRatings: state.app.ratings,
}))
@injectIntl
export default class ProfileGames extends Component {
  static propTypes = propTypes;

  constructor(props) {
    super(props);

    const {
      location: { query },
      route: { path },
    } = this.props;
    const { filter, search } = query;

    this.selectedPlatforms = [];

    this.state = {
      prevPath: path,
      isWishlist: path === 'wishlist',
      filter: prepareFilter(filter),
      editing: false,
      searchValue: search || '',
    };
  }

  componentDidUpdate(previousProperties, previousState) {
    if (previousState.isWishlist !== this.state.isWishlist) {
      this.updateCategories({});
    }
  }

  static getDerivedStateFromProps(props, state) {
    if (props.route.path !== state.prevPath) {
      return {
        prevPath: props.route.path,
        isWishlist: props.route.path === 'wishlist',
        searchValue: '',
        editing: false,
      };
    }

    return null;
  }

  getUrl(id) {
    return this.state.isWishlist ? paths.profileGamesToPlay(id) : paths.profileGames(id);
  }

  handleFilterChange = (filter) => {
    const {
      dispatch,
      params: { id },
    } = this.props;
    const { searchValue } = this.state;
    const url = this.getUrl(id);

    dispatch(this.replaceUrl(url, filter, searchValue));

    this.updateCategories(filter);
  };

  onSearch = (search) => {
    const {
      dispatch,
      params: { id },
    } = this.props;
    const { searchValue, filter } = this.state;
    const url = this.getUrl(id);

    if (searchValue !== search) {
      this.setState({ searchValue: search }, () => {
        dispatch(this.replaceUrl(url, filter, search));

        if (this.state.isWishlist) {
          this.load({ page: 1, filter }, 'toplay');
        } else {
          this.updateCategories(filter);
        }
      });
    }

    return null;
  };

  onReset = () => {
    this.onSearch('');
  };

  load = async ({ page, filter: filterArgument } = {}, category) => {
    /* eslint-disable react/no-access-state-in-setstate */
    const { dispatch, params, profile } = this.props;
    const { games } = profile;
    const { id } = params;
    const { searchValue } = this.state;
    const { next } = get(games, category, {});
    const filter = prepareFilter(filterArgument || this.state.filter);

    this.setState({ filter });

    if (!page && !next) {
      return;
    }

    await dispatch(
      loadProfileGamesByStatus({
        id,
        page: page || next,
        filter: {
          ...filter,
          statuses: [category],
        },
        search: searchValue,
      }),
    );
  };

  updateCategories = (filterArgument) => {
    const { counters } = this.props.profile.games;
    const filter = filterArgument || this.state.filter;
    const categories = Object.keys(counters);

    categories.forEach((category) => {
      this.load({ page: 1, filter }, category);
    });
  };

  toggleEditing = () => {
    this.setState((state) => ({
      editing: !state.editing,
    }));
  };

  handleGameCardStatusChange = ({ newStatus, oldStatus, game }) => {
    const { currentUser, profile, dispatch, params } = this.props;

    if (isCurrentUser(currentUser, profile)) {
      const category = game.user_game.status;
      const { games } = profile;
      const { filter } = this.state;
      const { id } = params;
      const { next: page } = games[category];
      const { searchValue: search } = this.state;
      dispatch(
        gameStatusChanged({
          id,
          page,
          filter,
          search,
          newStatus,
          oldStatus,
          game,
        }),
      );
    }
  };

  replaceUrl(url, filter, search) {
    const query = prepareQuery(filter, search);

    return replace(`${url}?${query}`);
  }

  renderFilter() {
    const { stores, profile, currentUser, size } = this.props;
    const { platforms, years, genres } = profile;
    const { filter, editing } = this.state;

    return (
      <FilterWrapper
        profile={{
          platforms,
          years,
          genres,
          stores,
        }}
        filter={filter}
        handleFilterChange={this.handleFilterChange}
        toggleEditing={this.toggleEditing}
        editing={editing}
        isCurrentUser={isCurrentUser(currentUser, profile)}
        size={size}
      />
    );
  }

  renderSearch() {
    const { currentUser, profile, intl } = this.props;
    const { searchValue, isWishlist } = this.state;

    const getPlaceholder = () => {
      if (isWishlist) {
        return 'profile.input-search.wishlist';
      }

      return isCurrentUser(currentUser, profile) ? 'profile.input-search.current-user' : 'profile.input-search.guest';
    };

    return (
      <ImportSearchWithInfo
        value={searchValue}
        placeholder={intl.formatMessage({ id: getPlaceholder() })}
        onSearch={this.onSearch}
        onReset={this.onReset}
      />
    );
  }

  renderGames() {
    const {
      size,
      currentUser,
      profile,
      route: { path },
      params: { status },
      dispatch,
      platforms,
      allRatings,
    } = this.props;

    const { filter, editing, searchValue, isWishlist } = this.state;

    return (
      <Games
        size={size}
        dispatch={dispatch}
        allRatings={allRatings}
        path={path}
        editing={editing}
        platforms={platforms}
        updateCategories={this.updateCategories}
        toggleEditing={this.toggleEditing}
        handleGameCardStatusChange={this.handleGameCardStatusChange}
        load={this.load}
        profile={profile}
        currentUser={currentUser}
        filter={filter}
        searchValue={searchValue}
        status={status}
        isWishlist={isWishlist}
      />
    );
  }

  renderLoading() {
    return (
      <div className="profile__loading">
        <Loading2 radius={48} stroke={2} />
      </div>
    );
  }

  renderEmpty() {
    const { currentUser, profile } = this.props;

    return <EmptyState isCurrentUser={isCurrentUser(currentUser, profile)} />;
  }

  renderProfileGames() {
    return (
      <>
        {this.renderFilter()}
        {this.renderSearch()}
        {this.renderGames()}
      </>
    );
  }

  renderLoadingOrEmpty({ isLoading }) {
    return isLoading ? this.renderLoading() : this.renderEmpty();
  }

  render() {
    const { params, profile } = this.props;
    const { games } = profile;
    const { count, loading } = games;
    const { filter } = this.state;

    const displayGames = count || filter || params.status;

    return (
      <div className="profile-games">
        {displayGames ? this.renderProfileGames() : this.renderLoadingOrEmpty({ isLoading: loading })}
      </div>
    );
  }
}
