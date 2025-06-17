/* eslint-disable sonarjs/cognitive-complexity, react/no-find-dom-node */

import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { withRouter } from 'react-router';
import { injectIntl } from 'react-intl';
import { hot } from 'react-hot-loader/root';
import { stringify } from 'qs';
import memoize from 'fast-memoize';

import pick from 'lodash/pick';
import has from 'lodash/has';
import defaultTo from 'lodash/defaultTo';

import getScrollTop from 'tools/get-scroll-top';
import formatNumber from 'tools/format-number';
import getUrlWidthQuery from 'tools/get-url-with-query';
import { pageView } from 'scripts/analytics-helper';

import paths from 'config/paths';
import appHelper from 'app/pages/app/app.helper';
import denormalizeGamesArr from 'tools/redux/denormalize-games-arr';

import { currentUserIdType } from 'app/components/current-user/current-user.types';

import locationShape from 'tools/prop-types/location-shape';
import intlShape from 'tools/prop-types/intl-shape';

import Heading from 'app/ui/heading';
import DiscoverPage from 'app/ui/discover-page';
import DiscoverGamesList from 'app/components/discover-games-list';
import DiscoverSharing from 'app/ui/discover-sharing';
import ButtonFollow from 'app/ui/button-follow';

import { onlyExclusivesKey } from 'app/components/switcher-only-platform-exclusives/switcher';

import RelatedTags from 'app/components/related-tags';
import Description from './components/description';

import { prepareToFilter } from './components/filter-wrapper/filter-wrapper.lib';
import { loadCatalogGames } from './games.actions';

import './games.styl';

@hot
@injectIntl
@connect((state) => ({
  currentUserId: state.currentUser.id,
  seoTitle: state.games.games.seo_title,
  description: state.games.games.description,
  seoDescription: state.games.games.seo_description,
  seoH1: state.games.games.seo_h1,
  noindex: state.games.games.noindex,
  tags: state.games.games.related_tags,
  appSize: state.app.size,
  count: state.games.games.count,
  results: denormalizeGamesArr(state, 'games.games.results'),
  next: state.games.games.next,
  loading: state.games.games.loading,
  loaded: state.games.games.loaded,
  platforms: state.games.platforms,
  showOnlyMyPlatforms: state.app.settings.showOnlyMyPlatforms,
  showOnlyMyPlatformsSSR: state.games.showOnlyMyPlatformsSSR,
}))
@withRouter
export default class Games extends PureComponent {
  static propTypes = {
    currentUserId: currentUserIdType.isRequired,
    location: locationShape.isRequired,
    platforms: PropTypes.arrayOf(PropTypes.object).isRequired,
    dispatch: PropTypes.func.isRequired,
    intl: intlShape.isRequired,
    seoTitle: PropTypes.string,
    seoDescription: PropTypes.string,
    description: PropTypes.string,
    seoH1: PropTypes.string,
    filters: PropTypes.shape({
      dates: PropTypes.array,
    }),
    noindex: PropTypes.bool.isRequired,
    next: PropTypes.number,
    count: PropTypes.number,
    loading: PropTypes.bool.isRequired,
    loaded: PropTypes.bool.isRequired,
    results: PropTypes.arrayOf(PropTypes.object).isRequired,
    tags: PropTypes.arrayOf(PropTypes.shape()),
    appSize: PropTypes.string.isRequired,
    followBtn: PropTypes.shape({
      following: PropTypes.bool.isRequired,
      followLoading: PropTypes.bool,
      onClick: PropTypes.func.isRequired,
    }),
    showOnlyMyPlatforms: PropTypes.bool,
    showOnlyMyPlatformsSSR: PropTypes.bool,
  };

  static defaultProps = {
    filters: {},
    next: null,
    seoTitle: null,
    description: null,
    seoDescription: null,
    seoH1: null,
    count: 0,
    tags: undefined,
    followBtn: undefined,
    showOnlyMyPlatforms: undefined,
    showOnlyMyPlatformsSSR: undefined,
  };

  constructor(props) {
    super(props);

    this.contentTopRef = React.createRef();

    this.prepareToFilter = memoize(this.prepareToFilter);
  }

  prepareToFilter = (filters) =>
    pick(prepareToFilter(filters), [
      'ordering',
      'dates',
      'platforms',
      'parent_platforms',
      'developers',
      'publishers',
      'stores',
      'genres',
      'tags',
      'disable_user_platforms',
      onlyExclusivesKey,
    ]);

  componentDidMount = () => window.scrollTo(0, 0);

  componentDidUpdate = (previousProperties) => {
    if (stringify(this.props.filters) !== stringify(previousProperties.filters)) {
      this.load({ page: 1, filter: this.props.filters });
      this.maybeScrollToContentTop();
    }
  };

  load = async ({ page, filters = this.props.filters } = {}) => {
    const { dispatch, next, location } = this.props;
    const nextPage = (typeof page === 'number' && page) || next;

    await dispatch(
      loadCatalogGames({
        page: nextPage,
        filter: filters,
      }),
    );

    pageView(getUrlWidthQuery(location, { page: nextPage }));
  };

  maybeScrollToContentTop = () => {
    const element = this.contentTopRef.current;
    return getScrollTop() > element.offsetTop && element.scrollIntoView();
  };

  renderDescription() {
    const { description, tags } = this.props;

    return (
      <>
        <div ref={this.contentTopRef} />
        {description && <Description description={description} />}
        {tags && <RelatedTags tags={tags} />}
      </>
    );
  }

  render() {
    const {
      filters,
      platforms,
      intl,
      seoTitle,
      seoDescription,
      seoH1,
      followBtn,
      noindex,
      location,
      appSize,
      results: items,
      count,
      loading,
      loaded,
      next,
      currentUserId,
      showOnlyMyPlatforms,
      showOnlyMyPlatformsSSR,
    } = this.props;

    const { pathname } = location;

    const countString = formatNumber(count);
    const preparedFilters = this.prepareToFilter(filters);
    const defaultTitle = intl.formatMessage({ id: 'games.head_title' }, { count: countString });
    const isPhone = appHelper.isPhoneSize(appSize);
    const title = pathname === paths.games ? defaultTitle : seoTitle || defaultTitle;
    const desktopHeading = <Heading rank={1}>{seoH1}</Heading>;
    const headerRightContent = () => {
      const followButtonActive = followBtn && !filters.dates;
      const disable = !followButtonActive && isPhone;

      if (disable) {
        return null;
      }

      return (
        <>
          {followButtonActive && <ButtonFollow className="games__follow-btn" {...followBtn} />}
          <DiscoverSharing url={pathname} />
        </>
      );
    };

    const enableOnlyMyPlatformsFilter = !!currentUserId && (!!preparedFilters.tags || !!preparedFilters.genres);
    const enableOnlyPlatformsExclusives = !!preparedFilters.platforms || !!preparedFilters.parent_platforms;

    return (
      <DiscoverPage
        pageProperties={{
          helmet: {
            title,
            description: seoDescription || intl.formatMessage({ id: 'games.head_description' }, { count: countString }),
            canonical: pathname,
            noindex,
          },
        }}
        className="games"
        pathname={pathname}
        isPhoneSize={isPhone}
        heading={isPhone ? seoH1 : desktopHeading}
        description={this.renderDescription()}
        headerRightContent={headerRightContent()}
      >
        <DiscoverGamesList
          load={this.load}
          withFilter
          filterProperties={{
            filters: preparedFilters,
            urlBase: paths.games,
            linkable: true,
            enablePlatformsFilter: !has(preparedFilters, 'stores'),
            showOnlyMyPlatforms: defaultTo(showOnlyMyPlatforms, showOnlyMyPlatformsSSR),
            enableOnlyMyPlatformsFilter,
            enableOnlyPlatformsExclusives,
            platforms,
          }}
          games={{
            items,
            count,
            next,
            loading,
            loaded,
          }}
        />
      </DiscoverPage>
    );
  }
}
