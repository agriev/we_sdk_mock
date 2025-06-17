import React, { useCallback, useEffect } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { injectIntl } from 'react-intl';
import { hot } from 'react-hot-loader/root';
import { compose } from 'recompose';
import { denormalize } from 'normalizr';
import { push, replace, goBack } from 'react-router-redux';

import cond from 'ramda/src/cond';
import propEq from 'ramda/src/propEq';
import always from 'ramda/src/always';
import T from 'ramda/src/T';

import paths from 'config/paths';

import prepare from 'tools/hocs/prepare';

import '../../discover.styl';
import './search.styl';

import Schemas from 'redux-logic/schemas';

import id from 'tools/id';

import appHelper from 'app/pages/app/app.helper';
import {
  loadDiscoverSearch,
  resetDiscoverSearch,
  loadDiscoverFollowings,
  toggleFollow,
  getDiscoverPageSize,
} from 'app/pages/discover/discover.actions';

import DiscoverPage from 'app/ui/discover-page';
import DiscoverSidebar from 'app/components/discover-sidebar';
import DiscoverColumns from 'app/components/discover-columns';
import ListLoader from 'app/ui/list-loader';
import { appSizeType } from 'app/pages/app/app.types';
import ImportSearchWithInfo from 'app/ui/input-search-with-info';
import {
  renderCardTemplate,
  renderGameCard,
  renderCollectionCard,
} from 'app/pages/discover/pages/search/search.helpers';

import currentUserType from 'app/components/current-user/current-user.types';

import locationShape from 'tools/prop-types/location-shape';
import intlShape from 'tools/prop-types/intl-shape';
import getPagesCount from 'tools/get-pages-count';

const hoc = compose(
  hot,
  prepare(async ({ store }) => {
    await Promise.all([store.dispatch(loadDiscoverFollowings())]);
  }),
  connect((state) => ({
    currentUser: state.currentUser,
    appSize: state.app.size,
    allRatings: state.app.ratings,
    count: state.discover.search.count,
    page: state.discover.search.next,
    loading: state.discover.search.loading,
    items: denormalize(state.discover.search.items, Schemas.DISCOVER_SEARCH_ARRAY, state.entities),
  })),
  injectIntl,
);

const propTypes = {
  currentUser: currentUserType.isRequired,
  allRatings: PropTypes.arrayOf(PropTypes.object).isRequired,
  location: locationShape.isRequired,
  intl: intlShape.isRequired,
  dispatch: PropTypes.func.isRequired,
  appSize: appSizeType.isRequired,
  count: PropTypes.number,
  items: PropTypes.arrayOf(PropTypes.object),
  page: PropTypes.number,
  loading: PropTypes.bool,
};

const defaultProps = {
  page: 1,
  loading: false,
  count: 0,
  items: [],
};

const DiscoverSearchComponent = ({
  currentUser,
  location,
  intl,
  appSize,
  items,
  count,
  page,
  loading,
  dispatch,
  allRatings,
}) => {
  const { query } = location.query;
  const pageSize = getDiscoverPageSize({ currentUser });
  const isPhoneSize = appHelper.isPhoneSize(appSize);
  const onSearch = useCallback((inputValue) => {
    if (inputValue) {
      dispatch(replace(paths.search(inputValue)));
    } else {
      dispatch(replace(paths.search()));
    }
  }, []);

  const onReset = useCallback(() => {
    if (window.history.length > 1) {
      dispatch(goBack());
    } else {
      dispatch(push(paths.discover));
    }
  }, []);

  const search = (pageArgument) => {
    if (query) {
      return dispatch(loadDiscoverSearch({ page: pageArgument || page, query }));
    }

    return dispatch(resetDiscoverSearch());
  };

  useEffect(() => {
    search(1);
  }, [query]);

  useEffect(() => {
    const onKeydown = (event) => {
      if (event.key === 'Escape') {
        onReset();
      }
    };

    window.addEventListener('keydown', onKeydown);

    return () => {
      window.removeEventListener('keydown', onKeydown);
    };
  }, []);

  const onFollowClick = useCallback((item) => toggleFollow(dispatch, item), []);

  const tmplData = {
    intl,
    onFollowClick,
    currentUser,
    appSize,
    dispatch,
    allRatings,
  };

  const renderItem = useCallback(
    cond([
      [propEq('instance', 'publisher'), renderCardTemplate(tmplData)],
      [propEq('instance', 'developer'), renderCardTemplate(tmplData)],
      [propEq('instance', 'person'), renderCardTemplate(tmplData)],
      [propEq('instance', 'genre'), renderCardTemplate(tmplData)],
      [propEq('instance', 'platform'), renderCardTemplate(tmplData)],
      [propEq('instance', 'tag'), renderCardTemplate(tmplData)],
      [propEq('instance', 'user'), renderCardTemplate(tmplData)],
      [propEq('instance', 'game'), renderGameCard(tmplData)],
      [propEq('instance', 'collection'), renderCollectionCard(tmplData)],
      [T, always(null)],
    ]),
    [],
  );

  return (
    <DiscoverPage
      className="discover-search"
      pageProperties={{
        withSidebar: false,
        helmet: {
          title: intl.formatMessage({
            id: 'discover.title_search',
          }),
        },
      }}
      pathname={location.pathname}
      isPhoneSize={isPhoneSize}
    >
      <div className="discover-search">
        <div className="discover-search__input">
          <ImportSearchWithInfo
            value={query}
            placeholder={intl.formatMessage(id('search.search_page_input_placeholder'))}
            onSearch={onSearch}
            onReset={onReset}
            counter={count ? `Found ${count} items` : undefined}
            alwaysShowClose
            autoFocus
          />
        </div>
        <div className="discover-search__content">
          {/* <DiscoverSidebar searchPage onlyOnPhone={false} pathname={location.pathname} isPhoneSize={isPhoneSize} /> */}
          <ListLoader
            load={useCallback(search, [query, page])}
            count={count}
            next={page}
            loading={loading}
            pages={getPagesCount(count, pageSize)}
            isOnScroll
          >
            <DiscoverColumns items={items} renderItem={renderItem} />
          </ListLoader>
        </div>
      </div>
    </DiscoverPage>
  );
};

DiscoverSearchComponent.propTypes = propTypes;
DiscoverSearchComponent.defaultProps = defaultProps;

const DiscoverSearch = hoc(DiscoverSearchComponent);

export default DiscoverSearch;
