/* eslint-disable camelcase */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { hot } from 'react-hot-loader';
import { connect } from 'react-redux';
import { injectIntl } from 'react-intl';
import { denormalize } from 'normalizr';
import get from 'lodash/get';

import paths from 'config/paths';
import Schemas from 'redux-logic/schemas';
import prepare from 'tools/hocs/prepare';
import checkAuth from 'tools/hocs/check-auth';
import SimpleIntleMessage from 'app/components/simple-intl-message';

import intlShape from 'tools/prop-types/intl-shape';

import appHelper from 'app/pages/app/app.helper';
import Page from 'app/ui/page';
import Content from 'app/ui/content';
import Heading from 'app/ui/heading';
import SimilarPlayersList from 'app/components/similar-players-list';

import { appSizeType, appFeedCountersType, appReactionsType } from 'app/pages/app/app.types';
import currentUserType from 'app/components/current-user/current-user.types';
import locationShape from 'tools/prop-types/location-shape';

import NotificationsList from './components/notifications/notifications-list';
import ActivityReviewForm from './components/activity-review-form';
import ActivityPostForm from './components/activity-post-form';

import { loadFeedNotifications, resetCounter, loadSimilar } from './activity.actions';

import './activity.styl';

import notificationsGenericEvents from './components/notifications-temp-data';

const componentPropertyTypes = {
  // Пропсы из hoc'ов
  feedCounters: appFeedCountersType.isRequired,
  reactions: appReactionsType.isRequired,
  allRatings: PropTypes.arrayOf(PropTypes.object).isRequired,
  location: locationShape.isRequired,
  currentUser: currentUserType.isRequired,
  notifications: PropTypes.shape({
    count: PropTypes.number,
    next: PropTypes.number,
    loading: PropTypes.bool,
    previous: PropTypes.string,
    results: PropTypes.array,
  }).isRequired,
  similar: PropTypes.shape({
    count: PropTypes.number,
    next: PropTypes.number,
    loading: PropTypes.bool,
    results: PropTypes.array,
  }).isRequired,
  size: appSizeType.isRequired,
  host: PropTypes.string.isRequired,
  dispatch: PropTypes.func.isRequired,
  notificationFeed: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  intl: intlShape.isRequired,
};

const TAB_NOTIFICATIONS = paths.notifications;

const defaultProps = {};

@hot(module)
@prepare()
@checkAuth({ login: true })
@injectIntl
@connect((state) => ({
  size: state.app.size,
  host: state.app.request.headers.host,
  similar: state.activity.similar,
  notifications: state.activity.notifications,
  currentUser: state.currentUser,
  feedCounters: state.app.feedCounters,
  reactions: state.app.reactions,
  allRatings: state.app.ratings,
  notificationFeed: denormalize(state.activity.notifications.results, Schemas.NOTIFICATION_FEED_ARRAY, state.entities),
}))
class Activity extends Component {
  static propTypes = componentPropertyTypes;

  constructor(props) {
    super(props);

    this.state = {
      displayEventsMode: 'realdata',
      showAddReviewForm: false,
      showAddPostForm: false,
      pageArt: this.getPageArt(),
    };
  }

  componentDidMount() {
    this.resetTabCounter();
    this.load();
  }

  componentDidUpdate(previousProperties) {
    if (previousProperties.location.pathname !== this.props.location.pathname) {
      this.resetTabCounter();
      // eslint-disable-next-line react/no-did-update-set-state
      this.setState({
        showAddReviewForm: false,
        showAddPostForm: false,
      });
      this.load(1);
    }
  }

  onClickToAddReview = () =>
    this.setState((state) => ({
      showAddReviewForm: !state.showAddReviewForm,
      showAddPostForm: false,
    }));

  onClickToAddPost = () =>
    this.setState((state) => ({
      showAddPostForm: !state.showAddPostForm,
      showAddReviewForm: false,
    }));

  getPageArt = () => ({
    height: '1500px',
    image: {
      color: 'rgba(5, 63, 106, 0.9)',
      // color: `rgba(${colorHandler.hexToRgb(game_background.dominant_color).join(',')},0.8)`,
      path: get(this.props.currentUser, 'game_background.url', 'RANDOM'),
    },
  });

  getNotificationsEvents = () => {
    switch (this.state.displayEventsMode) {
      case 'realdata':
        return {
          ...this.props.notifications,
          results: this.props.notificationFeed,
        };
      case 'generic':
        return notificationsGenericEvents;
      case 'none':
      default:
        return {
          count: 0,
          next: null,
          loading: false,
          results: [],
        };
    }
  };

  resetTabCounter = () => {
    const {
      dispatch,
      location: { pathname },
    } = this.props;

    if (pathname === TAB_NOTIFICATIONS) {
      setTimeout(() => {
        dispatch(resetCounter('notifications'));
      }, 1500);
    }
  };

  handlerTabs = (tab) => {
    if (tab !== this.state.tab) {
      this.setState({ tab });
    }
  };

  handleGenericEvents = (event) => {
    this.setState({
      displayEventsMode: event.target.value,
    });
  };

  load = (page) => {
    const { notifications, dispatch } = this.props;

    return Promise.all([dispatch(loadSimilar(1)), dispatch(loadFeedNotifications(page || notifications.next))]);
  };

  getHelmet = () => ({
    title: this.props.intl.formatMessage({
      id: 'feed.head_title_notifications',
    }),
    noindex: true,
  });

  renderDisplayModes = () => {
    const { host } = this.props;

    if (!appHelper.isDevWebsite(host)) {
      return null;
    }

    return (
      <div className="activity__dev-radiobuttons">
        <label key="realdata" htmlFor="radio_realdata" className="activity__dev-radiobutton">
          <input
            id="radio_realdata"
            type="radio"
            name="events_render_mode"
            value="realdata"
            onChange={this.handleGenericEvents}
            checked={this.state.displayEventsMode === 'realdata'}
          />
          Show real data from backend
        </label>
        <label key="generic" htmlFor="radio_generic_events" className="activity__dev-radiobutton">
          <input
            id="radio_generic_events"
            type="radio"
            name="events_render_mode"
            value="generic"
            onChange={this.handleGenericEvents}
            checked={this.state.displayEventsMode === 'generic'}
          />
          Show generic events instead data from API
        </label>
        <label key="none" htmlFor="radio_none" className="activity__dev-radiobutton">
          <input
            id="radio_none"
            type="radio"
            name="events_render_mode"
            value="none"
            onChange={this.handleGenericEvents}
            checked={this.state.displayEventsMode === 'none'}
          />
          Show page with none events (check empty state)
        </label>
      </div>
    );
  };

  renderDesktop = ({ showAddReviewForm, showAddPostForm, similar, size, allRatings }) => (
    <Page helmet={this.getHelmet()} art={this.state.pageArt}>
      <div className="activity__tabs-wrap">
        <Heading className="activity__header" rank={1}>
          <SimpleIntleMessage id="activity.tab_notifications" />
        </Heading>
      </div>

      <Content className="activity__columns" columns="2-1">
        <div>
          {showAddReviewForm && (
            <ActivityReviewForm
              user={this.props.currentUser}
              reactions={this.props.reactions}
              dispatch={this.props.dispatch}
              onCancel={this.onClickToAddReview}
            />
          )}
          {showAddPostForm && (
            <ActivityPostForm
              user={this.props.currentUser}
              dispatch={this.props.dispatch}
              onCancel={this.onClickToAddPost}
            />
          )}
          <div className="activity__events-list">
            <NotificationsList
              load={this.load}
              currentUser={this.props.currentUser}
              events={this.getNotificationsEvents()}
              size={size}
              dispatch={this.props.dispatch}
              allRatings={allRatings}
            />
          </div>
        </div>
        <div className="activity__sidebar">
          {this.renderDisplayModes()}
          <SimilarPlayersList users={similar.results} />
        </div>
      </Content>
    </Page>
  );

  renderPhone = ({ showAddReviewForm, showAddPostForm, size, allRatings }) => (
    <Page helmet={this.getHelmet()} art={this.state.pageArt}>
      <Content className="activity__columns" columns="1">
        <div>
          <Heading className="activity__header" rank={1}>
            <SimpleIntleMessage id="activity.tab_notifications" />
          </Heading>
          {showAddReviewForm && (
            <ActivityReviewForm
              user={this.props.currentUser}
              reactions={this.props.reactions}
              dispatch={this.props.dispatch}
              onCancel={this.onClickToAddReview}
            />
          )}
          {showAddPostForm && (
            <ActivityPostForm
              user={this.props.currentUser}
              dispatch={this.props.dispatch}
              onCancel={this.onClickToAddPost}
            />
          )}
          <div className="activity__events-list">
            <NotificationsList
              load={this.load}
              currentUser={this.props.currentUser}
              events={this.getNotificationsEvents()}
              size={size}
              dispatch={this.props.dispatch}
              allRatings={allRatings}
            />
          </div>
        </div>
      </Content>
    </Page>
  );

  render() {
    const { size, feedCounters, similar, allRatings } = this.props;
    const { showAddReviewForm, showAddPostForm } = this.state;
    const { notifications } = feedCounters;
    const data = {
      notifications,
      showAddReviewForm,
      showAddPostForm,
      similar,
      size,
      allRatings,
    };

    return appHelper.isPhoneSize({ size }) ? this.renderPhone(data) : this.renderDesktop(data);
  }
}

Activity.defaultProps = defaultProps;

export default Activity;
