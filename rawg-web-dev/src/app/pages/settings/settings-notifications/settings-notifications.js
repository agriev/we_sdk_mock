/* eslint-disable camelcase */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { hot } from 'react-hot-loader/root';
import { push } from 'react-router-redux';
import { connect } from 'react-redux';
import { FormattedMessage } from 'react-intl';

import paths from 'config/paths';

import currentUserType from 'app/components/current-user/current-user.types';
import locationShape from 'tools/prop-types/location-shape';

import Checkbox from 'app/ui/checkbox';

import { changeInfo, changeNotificationFromMail, loadNotificationsStatusesFromMail } from '../settings.actions';

import './settings-notifications.styl';

@hot
@connect((state) => ({
  currentUser: state.currentUser,
}))
export default class SettingsNotifications extends Component {
  static propTypes = {
    dispatch: PropTypes.func.isRequired,
    currentUser: currentUserType.isRequired,
    location: locationShape.isRequired,
  };

  componentDidMount() {
    const {
      location: { query },
      currentUser,
      dispatch,
    } = this.props;
    const { user_id, slug, hash, email } = query;

    if (!(currentUser.id || (user_id && slug && hash && email))) {
      dispatch(push(paths.register));
    }

    if (!currentUser.id && user_id && slug && hash && email) {
      dispatch(loadNotificationsStatusesFromMail(query));
    }
  }

  handleChange = (name, checked) => {
    const {
      location: { query },
      currentUser,
      dispatch,
    } = this.props;
    const { user_id, slug, hash, email } = query;

    if (currentUser.id) {
      return dispatch(changeInfo({ [name]: checked }));
    }

    if (user_id && slug && hash && email) {
      return dispatch(
        changeNotificationFromMail({
          user_id,
          hash,
          values: {
            [name]: checked,
          },
        }),
      );
    }

    return dispatch(push(paths.register));
  };

  render() {
    const { currentUser } = this.props;
    const {
      subscribe_mail_synchronization,
      subscribe_mail_reviews_invite,
      subscribe_mail_recommendations,
    } = currentUser;

    const onChangeSync = (checked) => this.handleChange('subscribe_mail_synchronization', checked);
    const onChangeReviews = (checked) => this.handleChange('subscribe_mail_reviews_invite', checked);
    const onChangeRecommendations = (checked) => this.handleChange('subscribe_mail_recommendations', checked);

    return (
      <div className="settings-notifications">
        {subscribe_mail_synchronization !== undefined && (
          <Checkbox
            checked={subscribe_mail_synchronization}
            label={<FormattedMessage id="settings.notifications_subscribe_mail_synchronization" />}
            onChange={onChangeSync}
          />
        )}
        {subscribe_mail_reviews_invite !== undefined && (
          <Checkbox
            checked={subscribe_mail_reviews_invite}
            label={<FormattedMessage id="settings.notifications_subscribe_mail_reviews_invite" />}
            onChange={onChangeReviews}
          />
        )}
        {subscribe_mail_recommendations !== undefined && (
          <Checkbox
            checked={subscribe_mail_recommendations}
            label={<FormattedMessage id="settings.notifications_subscribe_mail_recommendations" />}
            onChange={onChangeRecommendations}
          />
        )}
      </div>
    );
  }
}
