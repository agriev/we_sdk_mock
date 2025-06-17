/* eslint-disable react/no-danger */

import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { hot } from 'react-hot-loader/root';
import { compose } from 'recompose';

import head from 'lodash/head';

import denormalizeGamesArr from 'tools/redux/denormalize-games-arr';
import HideOnScroll from 'app/render-props/hide-on-scroll';
import prepare from 'tools/hocs/prepare';
import colorHandler from 'tools/color-handler';
import config from 'config/config';
import env from 'config/env';
import { throwEvent } from 'scripts/analytics-helper';

import appHelper from 'app/pages/app/app.helper';
import { loadBrowseShowcase } from 'app/pages/browse/browse.actions';
import Page from 'app/ui/page';
import Content from 'app/ui/content';
import Footer from 'app/ui/footer';

import storiesType from 'app/components/stories/stories.types';
import { appSizeType } from 'app/pages/app/app.types';
import { currentUserIdType } from 'app/components/current-user/current-user.types';
import locationShape from 'tools/prop-types/location-shape';

import Stories from 'app/components/stories';
import { loadGroups, loadGroup } from 'app/components/stories/stories.actions';

import { loadPopularReviews } from 'app/pages/reviews/reviews.actions';

import ShowcaseRecent, { defaultTime } from './components/recent';
import ShowcaseReviews from './components/reviews';
import ShowcaseCollections from './components/collections';
import ShowcaseSocial from './components/social';
import ShowcaseBrowse from './components/browse';

import {
  loadPersons,
  loadCollections,
  loadNews,
  loadRecentCurrent,
  loadRecentFuture,
  loadRecentPast,
} from './showcase.actions';
import './showcase.styl';

const { showcaseRecent, stories: storiesEnabled } = config.features;

const hoc = compose(
  hot,
  prepare(async ({ store, location }) => {
    const { tldr } = location.query;

    const state = store.getState();
    const { token } = state.app;

    if (tldr) {
      await store.dispatch(loadGroup({ slug: tldr }));
    }

    await Promise.all([
      storiesEnabled && !token && store.dispatch(loadGroups()),
      showcaseRecent &&
        Promise.all([
          store.dispatch(loadRecentCurrent()),
          store.dispatch(loadRecentFuture()),
          store.dispatch(loadRecentPast()),
        ]),
      store.dispatch(loadNews()),
      store.dispatch(loadCollections()),
      store.dispatch(loadPersons()),
      store.dispatch(loadPopularReviews({ page: 1 })),
      store.dispatch(loadBrowseShowcase()),
    ]);
  }),
  connect((state) => ({
    size: state.app.size,
    currentUserId: state.currentUser.id,
    query: state.app.request.query,
    stories: state.stories,
    showcaseRecentGames: denormalizeGamesArr(state, `showcase.recent.${defaultTime}.items`),
  })),
);

const componentPropertyTypes = {
  size: appSizeType.isRequired,
  currentUserId: currentUserIdType,
  location: locationShape.isRequired,
  stories: storiesType.isRequired,
  dispatch: PropTypes.func.isRequired,
  showcaseRecentGames: PropTypes.arrayOf(PropTypes.object),
};

const componentDefaultProperties = {
  showcaseRecentGames: [],
  currentUserId: undefined,
};

@hoc
class Showcase extends React.Component {
  static propTypes = componentPropertyTypes;

  static defaultProps = componentDefaultProperties;

  constructor(props) {
    super(props);

    if (env.isClient()) {
      this.landscapeAspectMatcher = window.matchMedia('(min-aspect-ratio: 10/9)');
      this.landscapeAspectMatcher.addListener(this.onAspectChange);
    } else {
      this.landscapeAspectMatcher = { matches: false };
    }
  }

  async componentDidMount() {
    const { dispatch, currentUserId } = this.props;
    if (storiesEnabled && currentUserId) {
      await dispatch(loadGroups());
    }
  }

  componentWillUnmount() {
    this.landscapeAspectMatcher.removeListener(this.onAspectChange);
  }

  onAspectChange = () => {
    const { size } = this.props;

    if (appHelper.isPhoneSize({ size })) {
      this.forceUpdate();

      const label = this.landscapeAspectMatcher.matches ? 'landscape' : 'portrait';

      throwEvent({ category: 'stories', action: 'orientation change', label });
    }
  };

  getBackgroundArt = ({ size, showcaseRecentGames }) => {
    const isDesktop = appHelper.isDesktopSize({ size });
    const mainTrend =
      Array.isArray(showcaseRecentGames) && showcaseRecentGames.length > 0 ? showcaseRecentGames[0] : {};

    return {
      height: isDesktop ? '800px' : '1500px',
      image: {
        path: mainTrend.background_image,
        color: mainTrend.dominant_color ? `rgba(${colorHandler.hexToRgb(mainTrend.dominant_color).join(',')},0.7)` : '',
      },
    };
  };

  render() {
    const { size, showcaseRecentGames, location, stories } = this.props;

    const { tldr } = location.query;
    const firstStory = head(stories.groups);

    return (
      <Page
        className="showcase"
        art={this.getBackgroundArt({ size, showcaseRecentGames })}
        helmet={{
          canonical: tldr && firstStory ? `/?tldr=${firstStory.slug}` : '/',
          title: tldr && firstStory ? firstStory.seo_title : undefined,
          description: tldr && firstStory ? firstStory.seo_description : undefined,
          image: tldr && firstStory ? firstStory.seo_image : undefined,
        }}
      >
        <Content className="showcase__content" fullScreen columns="1">
          <div className="showcase__inner">
            {storiesEnabled && <Stories />}
            <ShowcaseSocial />
            {showcaseRecent && <ShowcaseRecent />}
            <ShowcaseBrowse />
            <HideOnScroll>{(isActive) => <ShowcaseReviews isSeo={isActive} />}</HideOnScroll>
            <HideOnScroll>{(isActive) => <ShowcaseCollections isSeo={isActive} />}</HideOnScroll>
          </div>
          <Footer className="showcase__footer" />
        </Content>
      </Page>
    );
  }
}

export default Showcase;
