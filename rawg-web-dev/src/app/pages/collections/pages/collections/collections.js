import React, { Component } from 'react';
import { connect } from 'react-redux';
import { injectIntl } from 'react-intl';
import PropTypes from 'prop-types';

import prepare from 'tools/hocs/prepare';
import appHelper from 'app/pages/app/app.helper';
import paths from 'config/paths';

import { loadAllCollections, loadPopularCollections, PAGE_SIZE } from 'app/pages/collections/collections.actions';

import intlShape from 'tools/prop-types/intl-shape';

import ListLoader from 'app/ui/list-loader';
import DiscoverPage from 'app/ui/discover-page';
import CollectionCard from 'app/ui/collection-card-new';
import Heading from 'app/ui/heading';
import SimpleIntlMessage from 'app/components/simple-intl-message';
import Tabs from 'app/ui/tabs';
import Tab from 'app/ui/tabs/tab';

import './collections.styl';

import collectionsType from 'app/pages/collections/collections.types';
import locationShape from 'tools/prop-types/location-shape';
import getPagesCount from 'tools/get-pages-count';

import DiscoverColumns from 'app/components/discover-columns';
import { loadDiscoverFollowings } from 'app/pages/discover/discover.actions';

const isPopular = (path) => path.includes('popular');

const propTypes = {
  collections: collectionsType.isRequired,
  location: locationShape.isRequired,
  dispatch: PropTypes.func.isRequired,
  intl: intlShape.isRequired,
  appSize: PropTypes.string.isRequired,
};

@prepare(async ({ store, location }) => {
  const page = parseInt(location.query.page, 10) || 1;

  await Promise.all([
    store.dispatch(loadPopularCollections(isPopular(location.pathname) ? page : 1)),
    store.dispatch(loadAllCollections(isPopular(location.pathname) ? 1 : page)),
    store.dispatch(loadDiscoverFollowings()),
  ]);
})
@injectIntl
@connect((state) => ({
  collections: state.collections,
  appSize: state.app.size,
}))
export default class Collections extends Component {
  static propTypes = propTypes;

  componentDidUpdate(previousProperties) {
    const { location, dispatch } = this.props;

    if (location.pathname !== previousProperties.location.pathname) {
      const page = parseInt(location.query.page, 10) || 1;

      if (isPopular(location.pathname)) {
        dispatch(loadPopularCollections(page));
      } else {
        dispatch(loadAllCollections(page));
      }
    }
  }

  loadNextCollections = () => {
    const { collections, location, dispatch } = this.props;

    return isPopular(location.pathname)
      ? dispatch(loadPopularCollections(collections.popular.next))
      : dispatch(loadAllCollections(collections.all.next));
  };

  renderItem = (item) => {
    const { appSize, dispatch } = this.props;

    return (
      <CollectionCard
        size={appSize}
        kind="float"
        collection={item}
        key={item.id}
        dispatch={dispatch}
        followingEnabled
      />
    );
  };

  renderContent(items) {
    return <DiscoverColumns className="collections__items-list" renderItem={this.renderItem} items={items} />;
  }

  render() {
    const { intl, collections, location, appSize } = this.props;
    const { pathname } = location;
    const collectionsList = isPopular(pathname) ? collections.popular : collections.all;
    const pageKind = isPopular(pathname) ? 'popular' : 'all';
    const { count, next, loading, results } = collectionsList;
    const isPhoneSize = appHelper.isPhoneSize({ size: appSize });
    const heading = <SimpleIntlMessage id={`collections.title_${pageKind}`} />;

    return (
      <DiscoverPage
        pageProperties={{
          helmet: {
            title: intl.formatMessage({ id: `collections.meta_title_${pageKind}` }),
            description: intl.formatMessage({
              id: `collections.meta_description_${pageKind}`,
            }),
          },
          sidebarProperties: {
            needControls: true,
          },
        }}
        className="collections"
        pathname={pathname}
        isPhoneSize={isPhoneSize}
        heading={
          !isPhoneSize && (
            <Heading rank={1} withMobileOffset>
              {heading}
            </Heading>
          )
        }
      >
        <div className="collections__wrapper">
          <Tabs centred={false}>
            <Tab to={paths.collectionsPopular} active={pathname === paths.collectionsPopular}>
              <SimpleIntlMessage id="collections.popular" />
            </Tab>
            <Tab to={paths.collections} active={pathname === paths.collections}>
              <SimpleIntlMessage id="collections.all" />
            </Tab>
          </Tabs>
          <ListLoader
            load={this.loadNextCollections}
            count={count}
            next={next}
            loading={loading}
            pages={getPagesCount(count, PAGE_SIZE)}
            isOnScroll
          >
            {this.renderContent(results)}
          </ListLoader>
        </div>
      </DiscoverPage>
    );
  }
}
