import cn from 'classnames';
import React, { useEffect, useCallback, useMemo } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { injectIntl, FormattedMessage } from 'react-intl';
import { hot } from 'react-hot-loader/root';
import { compose } from 'recompose';
import { push } from 'react-router-redux';

import get from 'lodash/get';
import defaultTo from 'lodash/defaultTo';
import startsWith from 'lodash/startsWith';

import T from 'ramda/src/T';
import F from 'ramda/src/F';
import complement from 'ramda/src/complement';
import equals from 'ramda/src/equals';
import cond from 'ramda/src/cond';

import '../discover.styl';

import prepare from 'tools/hocs/prepare';
import compareBy from 'tools/ramda/compare-by';
import denormalizeGamesArr from 'tools/redux/denormalize-games-arr';
import trans from 'tools/trans';
import Error404 from 'interfaces/error-404';
import getPreviousYear from 'tools/dates/previous-year';
import getCurrentYear from 'tools/dates/current-year';
import getUrlWidthQuery from 'tools/get-url-with-query';
import { pageView } from 'scripts/analytics-helper';

import paths from 'config/paths';

import appHelper from 'app/pages/app/app.helper';
import {
  loadDiscoverGames,
  setDiscoverDisplayMode,
  loadDiscoverFollowings,
  getEndpoint,
  loadSectionsYears,
  hideRecommendedGame,
} from 'app/pages/discover/discover.actions';

import { loadCatalog, loadMainPlatforms } from 'app/pages/games/games.actions';

import {
  prepareDiscoverFilter,
  myPlatformsFilterWorthShow,
} from 'app/components/discover-filter/discover-filter.funcs';

import {
  headingsId,
  defaultSection,
  DISCOVER_SEC_ALL_TIME,
  DISCOVER_SEC_RECENT_PAST,
  DISCOVER_SEC_RECENT_CURRENT,
  DISCOVER_SEC_RECENT_FUTURE,
  DISCOVER_SEC_BEST,
  DISCOVER_SEC_TOP_RATED,
  isLibrarySection,
  isPrivateSection,
  DISCOVER_SEC_WISHLIST,
  DISCOVER_SEC_FRIENDS,
  DISCOVER_SEC_MAIN,
  DISCOVER_SEC_LIBRARY,
} from 'app/pages/discover/discover.sections';

import DiscoverPage from 'app/ui/discover-page';

import { appSizeType, appTokenType } from 'app/pages/app/app.types';
import currentUserType from 'app/components/current-user/current-user.types';
import locationShape from 'tools/prop-types/location-shape';
import intlShape from 'tools/prop-types/intl-shape';

import DiscoverGamesList from 'app/components/discover-games-list';
import Banners from 'app/components/banners';

import Heading from 'app/ui/heading';
import EmptyList from 'app/ui/empty-list';
import SitemapsLink from 'app/ui/sitemaps-link';

import { groupByYears } from 'app/pages/discover/discover.helpers';

import { getFiltersFromLocation } from 'app/ui/filter/filter.funcs';

import DiscoverMyLibraryTabs from 'app/pages/discover/components/library-tabs';
import denormalizeArray from 'tools/redux/denormalize-array';
import GamesSlider from 'app/components/games-slider/games-slider';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Link } from 'app/components/link';
import { isFlutter } from 'tools/is-flutter';
import fetch from 'tools/fetch';
import env from 'config/env';
import requestHandler from 'tools/request-handler';

const datesFilterEnabled = cond([
  [equals(defaultSection), F],
  [equals(DISCOVER_SEC_RECENT_PAST), F],
  [equals(DISCOVER_SEC_RECENT_CURRENT), F],
  [equals(DISCOVER_SEC_RECENT_FUTURE), F],
  [equals(DISCOVER_SEC_BEST), F],
  [equals(DISCOVER_SEC_TOP_RATED), F],
  [equals(DISCOVER_SEC_ALL_TIME), F],
  [T, T],
]);

const loadPrivateSections = ({ section, dispatch, userSlug, filters }) => () => {
  if (isPrivateSection(section)) {
    if (!userSlug) {
      dispatch(push(paths.discover));
    }

    dispatch(
      loadDiscoverGames({
        id: section || defaultSection,
        userSlug,
        filters,
      }),
    );
  }
};

const getHeadingString = ({ section, intl, recommendationsCount }) => {
  if (section === defaultSection) {
    return intl.formatMessage({ id: recommendationsCount > 0 ? 'discover.main_logged' : 'discover.main_guest' });
  }

  const id = headingsId[section];
  switch (section) {
    case DISCOVER_SEC_TOP_RATED: {
      return intl.formatMessage({ id }, { previousYear: getPreviousYear() });
    }
    case DISCOVER_SEC_BEST: {
      return intl.formatMessage({ id }, { currentYear: getCurrentYear() });
    }
    default: {
      return intl.formatMessage({ id });
    }
  }
};

const hoc = compose(
  hot,
  connect((state, props) => {
    const section = props.params.splat || defaultSection;

    return {
      section,
      appSize: state.app.size,
      appSettings: state.app.settings,
      appToken: state.app.token,
      appLocale: state.app.locale,
      currentUser: state.currentUser,
      showOnlyMyPlatforms: state.app.settings.showOnlyMyPlatforms,
      showOnlyMyPlatformsSSR: state.discover.showOnlyMyPlatformsSSR,
      platforms: state.games.platforms,
      mainPlatforms: denormalizeArray(state, 'games.mainPlatforms.items', 'MAIN_PLATFORMS_ARRAY'),
      items: denormalizeGamesArr(state, `discover.games.${section}.items`),
      count: get(state, `discover.games.${section}.count`),
      next: get(state, `discover.games.${section}.next`),
      loading: get(state, `discover.games.${section}.loading`),
      loaded: get(state, `discover.games.${section}.loaded`),
      recommendationsCount: get(state, `discover.games.${section}.recommendations_count`, 0),
      gamesSlider: get(state, 'discover.slider'),
      lastPlayed: state.discover.lastPlayed,
    };
  }),
  prepare(
    async ({ store, params, location }) => {
      const state = store.getState();
      const { currentUser } = state;
      const { settings: appSettings, token: appToken } = state.app;
      const section = params.splat || defaultSection;
      const filters = prepareDiscoverFilter(
        getFiltersFromLocation({ location, appSettings, currentUser, section, appToken }),
        section,
      );
      const page = parseInt(get(location, 'query.page', 1), 10);
      const endpoint = getEndpoint({ id: section });

      if (!endpoint) {
        throw new Error404();
      }

      const loadings = [
        store.dispatch(setDiscoverDisplayMode()),
        store.dispatch(loadDiscoverFollowings()),
        store.dispatch(loadSectionsYears(section)),
        store.dispatch(loadCatalog()),
        store.dispatch(loadMainPlatforms()),
      ];

      if (!isPrivateSection(section)) {
        const userAgent = env.isClient() ? navigator.userAgent : requestHandler.getUserAgent(state.app.request);

        loadings.push(
          store.dispatch(loadDiscoverGames({ id: section, filters, page, playable: isFlutter(userAgent) })),
        );
      }

      await Promise.all(loadings);
    },
    {
      updateOn: complement(
        compareBy(({ location, section, appSettings, appToken, showOnlyMyPlatforms }) => {
          return {
            showOnlyMyPlatforms,
            filters: getFiltersFromLocation({ location, appSettings, appToken, section }),
            section,
          };
        }),
      ),
    },
  ),
  injectIntl,
);

const propTypes = {
  location: locationShape.isRequired,
  count: PropTypes.number,
  items: PropTypes.arrayOf(PropTypes.object),
  next: PropTypes.number,
  loading: PropTypes.bool,
  loaded: PropTypes.bool,
  intl: intlShape.isRequired,
  appSize: appSizeType.isRequired,
  appToken: appTokenType,
  currentUser: currentUserType.isRequired,
  appSettings: PropTypes.shape().isRequired,
  dispatch: PropTypes.func.isRequired,
  platforms: PropTypes.arrayOf(PropTypes.object).isRequired,
  mainPlatforms: PropTypes.arrayOf(PropTypes.object).isRequired,
  showOnlyMyPlatforms: PropTypes.bool,
  showOnlyMyPlatformsSSR: PropTypes.bool,
  section: PropTypes.string,
  recommendationsCount: PropTypes.number,
  gamesSlider: PropTypes.array,
  lastPlayed: PropTypes.array,
};

const defaultProps = {
  appToken: undefined,
  next: null,
  loading: false,
  loaded: false,
  count: 0,
  items: [],
  showOnlyMyPlatformsSSR: undefined,
  showOnlyMyPlatforms: undefined,
  recommendationsCount: 0,
  gamesSlider: [],
};

const DiscoverSections = ({
  appToken,
  location,
  intl,
  section,
  appSize,
  appSettings,
  items,
  count,
  next,
  loading,
  loaded,
  dispatch,
  currentUser,
  platforms,
  mainPlatforms,
  showOnlyMyPlatforms,
  showOnlyMyPlatformsSSR,
  recommendationsCount,
  gamesSlider,
  lastPlayed,
}) => {
  const isPhoneSize = appHelper.isPhoneSize(appSize);
  const isMainPage = section === DISCOVER_SEC_MAIN;
  const enableOnlyMyPlatformsFilter = myPlatformsFilterWorthShow(currentUser, section, true, appToken);
  const headingString = getHeadingString({ section, intl, recommendationsCount });
  const title = headingsId[section] && section !== defaultSection ? headingString : undefined;
  const heading =
    section === defaultSection ? null : (
      <>
        <Heading rank={1}>{headingString}</Heading>
        {section === defaultSection && (
          <p className="discover__subtitle">
            {intl.formatMessage({
              id: recommendationsCount > 0 ? 'discover.main_subtitle_logged' : 'discover.main_subtitle_guest',
            })}
          </p>
        )}
      </>
    );
  const userSlug = currentUser.slug;
  const filters = prepareDiscoverFilter(
    getFiltersFromLocation({ location, appSettings, currentUser, section }),
    section,
  );
  const orderingFilter = JSON.stringify(filters.ordering);
  const datesFilter = JSON.stringify(filters.dates);
  const platformsFilter = JSON.stringify(filters.platforms);
  const parentPlatformsFilter = JSON.stringify(filters.parent_platforms);

  useEffect(
    loadPrivateSections({
      section,
      dispatch,
      userSlug,
      filters,
    }),
    [section, orderingFilter, datesFilter, platformsFilter, parentPlatformsFilter],
  );

  const load = useCallback(async () => {
    if (typeof navigator !== 'undefined' && isFlutter(navigator.userAgent)) {
      return [];
    }

    await dispatch(
      loadDiscoverGames({
        id: section,
        page: next,
        userSlug,
        filters,
      }),
    );

    pageView(getUrlWidthQuery(location, { page: next }));
  }, [userSlug, next, section, orderingFilter, datesFilter, platformsFilter, parentPlatformsFilter]);

  const urlBase = section === defaultSection ? '/' : paths.discoverSection(section);

  const hideRecommendationButton = {
    key: 'hide-recommendation-btn',
    onClick: (game) => {
      dispatch(hideRecommendedGame(game));
    },
    children: <FormattedMessage id="shared.games_card_button_hide" />,
  };

  const currentOrdering = get(filters, 'ordering[0]');

  const currentLastPlayed = useMemo(() => {
    return lastPlayed.filter((entry) => entry.slug !== location.pathname.replace('/games/', ''));
  }, [lastPlayed, location.pathname]);

  return (
    <DiscoverPage
      className={cn('discover', {
        'page-with-slider': gamesSlider.length > 0,
      })}
      pageProperties={{
        helmet: { title },
        sidebarProperties: {
          needControls: true,
        },
      }}
      pathname={location.pathname}
      isPhoneSize={isPhoneSize}
      heading={!isPhoneSize && heading}
      prechildren={
        location.pathname === '/' &&
        gamesSlider.length > 0 && (
          <div className="discover-pre">
            <GamesSlider
              style={location.pathname === '/' ? { marginBottom: 0 } : {}}
              items={gamesSlider}
              isPhoneSize={isPhoneSize}
            />

            {isPhoneSize && currentLastPlayed.length > 0 && (
              <div className="header-menu__section header-menu__section--recent discover-pre__recent">
                <strong className="header-menu__title discover-pre__title">Недавние</strong>
                <Swiper className="header-menu__lastPlayed-slider" slidesPerView={1.7} spaceBetween={16}>
                  {currentLastPlayed.map((item, key) => (
                    <SwiperSlide key={key}>
                      <Link
                        to={`/games/${item.slug}?utm_source=sidebar-recent&utm_medium=sidebar&utm_campaign=crosspromo`}
                        onClick={(event) => {
                          event.preventDefault();

                          if (typeof window.yaCounter === 'object') {
                            window.yaCounter.reachGoal('SidebarRecentGames');
                          }

                          if (window.gtag) {
                            window.gtag('event', 'recommendation_click', {
                              game_title: item.name,
                              source: 'sidebar_recent',
                            });
                          }

                          const next = event.currentTarget.href;

                          setTimeout(() => {
                            window.location.href = next;
                          });
                        }}
                        className={cn('header-menu__lastPlayed-slide', {
                          'header-menu__lastPlayed-slide--active': `/games/${item.slug}` === location.pathname,
                        })}
                      >
                        <img src={item.image} alt=" " />
                        <span>{item.name}</span>
                      </Link>
                    </SwiperSlide>
                  ))}
                </Swiper>
              </div>
            )}
          </div>
        )
      }
    >
      {isLibrarySection(section) && <DiscoverMyLibraryTabs section={section} />}
      {isMainPage && <Banners />}
      <DiscoverGamesList
        className="discover-games-list--home"
        load={load}
        section={section}
        withFilter
        clearFitlerPath={urlBase}
        filterProperties={{
          urlBase,
          linkable: 'withQueries',
          enableSortByRelevance: isMainPage,
          enableOrdering: section !== DISCOVER_SEC_ALL_TIME,
          enableDatesFilter: datesFilterEnabled(section),
          enablePlatformsFilter: true,
          enableOnlyMyPlatformsFilter,
          showOnlyMyPlatforms: defaultTo(showOnlyMyPlatforms, showOnlyMyPlatformsSSR),
          platforms: isMainPage ? mainPlatforms : platforms,
          filters,
        }}
        games={{
          items,
          count,
          next,
          loading,
          loaded,
        }}
        emptyMessage={
          section === DISCOVER_SEC_FRIENDS ? (
            <EmptyList message={trans('discover.following_empty_games_list')} />
          ) : (
            undefined
          )
        }
        gameCardProperties={{
          showAddedBy: section === DISCOVER_SEC_FRIENDS,
          showReleaseDate: section === DISCOVER_SEC_WISHLIST,
          additionalButtons: isMainPage && currentUser.id ? [hideRecommendationButton] : undefined,
        }}
        groupBy={
          startsWith(section, DISCOVER_SEC_LIBRARY) && currentOrdering === '-released' ? groupByYears : undefined
        }
      />
      <SitemapsLink />
    </DiscoverPage>
  );
};

DiscoverSections.propTypes = propTypes;
DiscoverSections.defaultProps = defaultProps;

export default hoc(DiscoverSections);
