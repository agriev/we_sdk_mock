import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { replace, push } from 'react-router-redux';
import { injectIntl, FormattedMessage } from 'react-intl';

import debounce from 'lodash/debounce';

import paths from 'config/paths';

import prepare from 'tools/hocs/prepare';
import denormalizeGamesArr from 'tools/redux/denormalize-games-arr';

import Page from 'app/ui/page';
import Content from 'app/ui/content';
import CloseButton from 'app/ui/close-button';
import InputSearch from 'app/ui/input-search';
import LoadMore from 'app/ui/load-more';
import SearchResults from 'app/ui/search-results';
import SearchTabs from 'app/ui/search-tabs';

import { appSizeType } from 'app/pages/app/app.types';
import currentUserType from 'app/components/current-user/current-user.types';
import locationShape from 'tools/prop-types/location-shape';
import intlShape from 'tools/prop-types/intl-shape';

import {
  findAllGames,
  findPersonalGames,
  findAllUsers,
  findAllCollections,
  findAllPersons,
  changeTab,
} from './search.actions';
import searchType from './search.types';

import './search.styl';

@prepare(async ({ store, location }) => {
  const { query, search } = location;

  if (search) {
    await Promise.all([
      store.dispatch(findAllGames(query.query, 1)),
      store.dispatch(findPersonalGames(query.query, 1)),
      store.dispatch(findAllUsers(query.query, 1)),
      store.dispatch(findAllCollections(query.query, 1)),
      store.dispatch(findAllPersons(query.query, 1)),
      store.dispatch(changeTab(query.tab)),
    ]);
  }
})
@injectIntl
@connect((state) => ({
  currentUserId: state.currentUser.id,
  search: state.search,
  size: state.app.size,
  allRatings: state.app.ratings,
  currentUser: state.currentUser,
  allGames: denormalizeGamesArr(state, 'search.allGames.results'),
  personalGames: denormalizeGamesArr(state, 'search.personalGames.results'),
}))
export default class Search extends Component {
  static propTypes = {
    // пропсы из hoc'ов:
    dispatch: PropTypes.func.isRequired,
    location: locationShape.isRequired,
    search: searchType.isRequired,
    intl: intlShape.isRequired,
    size: appSizeType.isRequired,
    route: PropTypes.shape({}).isRequired,
    currentUser: currentUserType.isRequired,
    allGames: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
    personalGames: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
    allRatings: PropTypes.arrayOf(PropTypes.object).isRequired,
  };

  constructor(props) {
    super(props);

    const {
      location: { query },
      currentUser: { id },
    } = this.props;

    this.state = {
      personal: id && query.personal === 'true',
      value: query.query || '',
    };
  }

  getCurrentData = (currentTab) => {
    const { search, allGames, personalGames } = this.props;

    switch (currentTab) {
      case 'library':
        return {
          ...search.personalGames,
          results: personalGames,
        };
      case 'collections':
        return search.allCollections;
      case 'persons':
        return search.allPersons;
      case 'users':
        return search.allUsers;
      case 'games':
      default:
        return {
          ...search.allGames,
          results: allGames,
        };
    }
  };

  handleChange = (value) => {
    const { dispatch } = this.props;
    const { value: stateValue, personal } = this.state;

    if (stateValue !== value) {
      this.setState({ value });
      dispatch(replace(paths.search(encodeURIComponent(value), personal)));
      dispatch(findAllUsers(value, 1));
      dispatch(findPersonalGames(value, 1));
      dispatch(findAllGames(value, 1));
      dispatch(findAllCollections(value, 1));
      dispatch(findAllPersons(value, 1));
    }
  };

  /* eslint-disable-next-line react/sort-comp */
  handleChangeDebounced = debounce(this.handleChange, 500);

  load = () => {
    const { dispatch, search } = this.props;
    const { tab } = search;
    const { value } = this.state;

    const currentData = this.getCurrentData(tab);

    switch (tab) {
      case 'games':
        return dispatch(findAllGames(value, currentData.next));
      case 'collections':
        return dispatch(findAllCollections(value, currentData.next));
      case 'library':
        return dispatch(findPersonalGames(value, currentData.next));
      case 'persons':
        return dispatch(findAllPersons(value, currentData.next));
      case 'users':
        return dispatch(findAllUsers(value, currentData.next));
      default:
        break;
    }
    return dispatch(findAllGames(value, currentData.next));
  };

  handleClose = () => {
    const { dispatch } = this.props;
    dispatch(push(paths.index));
  };

  noResultsRender = () => {
    const { search } = this.props;

    const { tab } = search;
    const { value } = this.state;

    const noResMessage =
      tab === 'library' ? (
        <FormattedMessage id="search.zero" values={{ currentTab: 'games' }} />
      ) : (
        <FormattedMessage id="search.zero" values={{ currentTab: tab }} />
      );

    return value && value.length > 0 ? noResMessage : '';
  };

  isPersonalAvailable() {
    const {
      currentUser: { id },
    } = this.props;
    const { value } = this.state;

    return Boolean(id && value);
  }

  render() {
    const { value } = this.state;
    const { intl, search, size, dispatch, allRatings, currentUser } = this.props;

    const { tab } = search;

    const { count, results = [], next, loading } = this.getCurrentData(tab);

    return (
      <Page
        helmet={{ title: intl.formatMessage({ id: 'search.head_title' }) }}
        className="search"
        art={false}
        header={{ display: false }}
      >
        <Content columns="1">
          <CloseButton className="search__close-button" onClick={this.handleClose} />
          <InputSearch
            value={value}
            className="search__input-search"
            placeholder={intl.formatMessage({ id: 'search.input_placeholder' })}
            autoFocus
            onChange={this.handleChangeDebounced}
          />
          <SearchTabs search={search} dispatch={dispatch} className="search__tabs" />
          {count > 0 || loading ? (
            <LoadMore appSize={size} load={this.load} count={count} next={next} loading={loading}>
              <SearchResults
                tab={tab}
                results={results}
                count={count}
                size={size}
                isFooter={false}
                className="search__search-results"
                query={value}
                maxResults={results.length}
                dispatch={dispatch}
                allRatings={allRatings}
                currentUser={currentUser}
              />
            </LoadMore>
          ) : (
            <div className="search__no-results">{this.noResultsRender()}</div>
          )}
        </Content>
      </Page>
    );
  }
}
