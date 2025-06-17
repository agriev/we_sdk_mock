import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { compose } from 'recompose';
import { injectIntl } from 'react-intl';

import last from 'lodash/last';

import './browse-listing.styl';

import prepare from 'tools/hocs/prepare';
import appHelper from 'app/pages/app/app.helper';
import locationChanged from 'tools/update-on/location-changed';

import { toSingularType } from 'tools/urls/entity-from-url';

import locationShape from 'tools/prop-types/location-shape';
import intlShape from 'tools/prop-types/intl-shape';
import getPagesCount from 'tools/get-pages-count';

import DiscoverPage from 'app/ui/discover-page';
import DiscoverColumns from 'app/components/discover-columns';
import Heading from 'app/ui/heading';
import ListLoader from 'app/ui/list-loader';
import CardTemplate from 'app/components/card-template';
import { prepareDataToCardTemplate, isCreator } from 'app/components/card-template/card-template.lib';
import Description from 'app/pages/games/components/description';

import { loadDiscoverFollowings, toggleFollow } from 'app/pages/discover/discover.actions';

import currentUserType from 'app/components/current-user/current-user.types';
import { loadListing, getBrowsePageSize } from './browse-listing.actions';

const getTypeFromLocation = (pathname) => pathname.split('/')[1];
const getListingType = (props) => getTypeFromLocation(props.location.pathname);

const getPageSlug = (path) => last(path.split('/'));

const hoc = compose(
  prepare(
    async ({ store, location }) => {
      const { pathname, query } = location;
      const { page = 1 } = query;
      const listingType = getTypeFromLocation(pathname);

      await Promise.all([store.dispatch(loadListing({ listingType, page })), store.dispatch(loadDiscoverFollowings())]);
    },
    {
      updateOn: locationChanged,
    },
  ),
  injectIntl,
  connect((state, ownProperties) => ({
    listing: state.browseListing[getListingType(ownProperties)],
    loading: state.browseListing.loading,
    appSize: state.app.size,
    currentUser: state.currentUser,
    firstRender: state.app.firstRender,
  })),
);

const propTypes = {
  currentUser: currentUserType.isRequired,
  listing: PropTypes.shape({
    next: PropTypes.number,
    seo_title: PropTypes.string,
    seo_description: PropTypes.string,
    seo_h1: PropTypes.string,
    count: PropTypes.number,
    description: PropTypes.string,
    results: PropTypes.array,
  }).isRequired,
  loading: PropTypes.bool.isRequired,
  location: locationShape.isRequired,
  intl: intlShape.isRequired,
  appSize: PropTypes.string.isRequired,
  dispatch: PropTypes.func.isRequired,
};

const defaultProps = {};

const BrowseListingComponent = ({ listing, loading, intl, location, appSize, dispatch, currentUser }) => {
  /* eslint-disable react/no-array-index-key */

  const { pathname } = location;

  if (!listing) {
    return null;
  }

  const type = getTypeFromLocation(pathname);
  const singularType = toSingularType(type);
  const load = useCallback(() => dispatch(loadListing({ listingType: type, page: listing.next })), [
    listing.next,
    pathname,
    type,
  ]);

  const pageSize = getBrowsePageSize({ currentUser });

  const onFollowClick = useCallback((item) => toggleFollow(dispatch, item, singularType), [singularType]);
  const isPhoneSize = appHelper.isPhoneSize({ size: appSize });
  const renderItem = useCallback(
    (item) => (
      <CardTemplate
        key={item.slug}
        {...prepareDataToCardTemplate({
          isPhoneSize,
          item,
          intl,
          collectionSlug: type,
          kind: isCreator(getPageSlug(pathname)) ? 'big' : 'medium',
          titleCentred: !isCreator(getPageSlug(pathname)),
          withImage: isCreator(getPageSlug(pathname)),
          flexibleHeight: true,

          following: item.following || false,
          followLoading: item.followLoading || false,
          onFollowClick,
        })}
      />
    ),
    [isPhoneSize, singularType],
  );

  return (
    <DiscoverPage
      className="discover"
      pageProperties={{
        helmet: {
          title: listing.seo_title,
          description: listing.seo_description,
        },
        sidebarProperties: {
          needControls: true,
        },
      }}
      pathname={pathname}
      isPhoneSize={isPhoneSize}
      heading={!isPhoneSize && <Heading rank={1}>{listing.seo_h1}</Heading>}
    >
      <div className="browse-listing">
        <Description description={listing.description} />
        <ListLoader
          load={load}
          count={listing.count}
          next={listing.next}
          loading={loading}
          pages={getPagesCount(listing.count, pageSize)}
          isOnScroll
        >
          <DiscoverColumns items={listing.results} renderItem={renderItem} />
        </ListLoader>
      </div>
    </DiscoverPage>
  );
};

BrowseListingComponent.propTypes = propTypes;
BrowseListingComponent.defaultProps = defaultProps;

const BrowseListing = hoc(BrowseListingComponent);

export default BrowseListing;
