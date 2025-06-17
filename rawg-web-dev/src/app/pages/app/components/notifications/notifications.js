/* eslint-disable camelcase, react/no-danger, jsx-a11y/anchor-is-valid */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import SVGInline from 'react-svg-inline';
import cn from 'classnames';

import closeIcon from 'assets/icons/close.svg';

import { customNotification as appCustomNotificationType, appTokenType, appLocaleType } from 'app/pages/app/app.types';

import { importStatusChanged } from 'app/pages/accounts-import/accounts-import.helpers';
import currentUserType from 'app/components/current-user/current-user.types';

import {
  getCustomNotification,
  addNotification,
  filterNotificationsByFunc,
  removeNotificationsById,
  checkImportProgress,
  setSubscriber,
  NOTIF_STATUS_SUCCESS,
} from './notifications.actions';
import './notifications.styl';

import notificationsType from './notifications.types';

// Кастомные оповещения с api: /api/banners/active
const CUSTOM_NOTIFICATION = 'custom-notification';
const CUSTOM_ID = (id) => `${CUSTOM_NOTIFICATION}-${id}`;

@connect((state) => ({
  customNotification: state.app.customNotification,
  token: state.app.token,
  locale: state.app.locale,
  currentUser: state.currentUser,
  notifications: state.notifications,
}))
export default class Notifications extends Component {
  static propTypes = {
    customNotification: appCustomNotificationType,
    token: appTokenType,
    locale: appLocaleType.isRequired,
    currentUser: currentUserType.isRequired,
    dispatch: PropTypes.func.isRequired,
    notifications: notificationsType.isRequired,
    pathname: PropTypes.string.isRequired,
    visible: PropTypes.bool.isRequired,
  };

  static defaultProps = {
    customNotification: null,
    token: undefined,
  };

  pusherEnabled = false;

  constructor(properties, context) {
    super(properties, context);

    this.state = {
      customReady: false,
    };
  }

  componentDidMount() {
    const {
      currentUser: { id: currentId },
      dispatch,
      pathname,
      locale,
    } = this.props;

    import('./notifications.subscriber').then((NotificationsSubscriber) => {
      this.NotificationsSubscriber = NotificationsSubscriber.default;
      this.NotificationsSubscriber.init({ dispatch, pathname, locale });

      setSubscriber(this.NotificationsSubscriber);

      this.enableCustomNotification();

      if (currentId) {
        this.enablePusher();
        dispatch(checkImportProgress());
        this.disableLocalUnauthenticatedNotifications();
      } else {
        // eslint-disable-next-line react/no-did-mount-set-state
        this.enableLocalUnauthenticatedNotifications();
      }
    });
  }

  componentDidUpdate(previousProperties) {
    const {
      dispatch,
      currentUser: { id: currentId },
      pathname,
    } = this.props;
    const {
      currentUser: { id: previousId },
      pathname: previousPathname,
    } = previousProperties;

    const { currentUser } = this.props;
    const { currentUser: previousCurrentUser } = previousProperties;

    if (this.NotificationsSubscriber && pathname !== previousPathname) {
      this.NotificationsSubscriber.setPathname(pathname);
    }

    if (importStatusChanged(currentUser, previousCurrentUser)) {
      dispatch(checkImportProgress());
    }

    if (currentId && !previousId) {
      this.enablePusher();
      this.disableLocalUnauthenticatedNotifications();
      dispatch(checkImportProgress());
    } else if (!currentId && previousId && this.NotificationsSubscriber) {
      this.NotificationsSubscriber.removeImportWaitingNotification();
      this.NotificationsSubscriber.removeImportProgressNotification();
      this.disablePusher();
      this.enableLocalUnauthenticatedNotifications();
    }
  }

  componentWillUnmount() {
    this.disablePusher();
  }

  addCustomNotification = () => {
    const { customNotification } = this.props;

    if (!customNotification) return;

    const { id, text, url, url_text } = customNotification;
    const notificationId = CUSTOM_ID(id);

    const params = {
      id: notificationId,
      custom: true,
      expires: 30,
      notifyPusher: true,
    };

    this.addNotification({
      ...params,
      weight: 4,
      message: (
        <span>
          <span
            dangerouslySetInnerHTML={{
              __html: text,
            }}
          />
          {url && [
            <span key="space">&nbsp;</span>,
            <a
              key="link"
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => this.props.dispatch(removeNotificationsById(notificationId))}
            >
              {url_text || url}
            </a>,
          ]}
        </span>
      ),
      status: NOTIF_STATUS_SUCCESS,
    });
  };

  enablePusher = () => {
    const { token, currentUser } = this.props;
    if (this.NotificationsSubscriber) {
      this.NotificationsSubscriber.enable({ token, currentUser });
    }
  };

  disablePusher = () => {
    this.pusherEnabled = false;
    if (this.NotificationsSubscriber) {
      this.NotificationsSubscriber.disable();
    }
  };

  addNotification = (data) => this.props.dispatch(addNotification(data));

  removeNotificationsById = (id) => {
    this.props.dispatch(removeNotificationsById(id));
  };

  disableLocalUnauthenticatedNotifications() {
    const byLocalAndAuth = (notification) => notification.local && notification.authenticated;
    this.props.dispatch(filterNotificationsByFunc(byLocalAndAuth));
  }

  enableLocalUnauthenticatedNotifications() {}

  enableCustomNotification() {
    const { dispatch } = this.props;

    dispatch(getCustomNotification()).then(() => {
      this.addCustomNotification();
      this.setState({ customReady: true });
    });
  }

  renderNotify = ({ id, message, status, deleting, fixed }) => (
    <div
      key={id}
      className={cn('notification', {
        notification_fixed: fixed,
        notification_deleting: deleting,
        [`notification_${status}`]: status,
      })}
    >
      <div className="notification__text">{message}</div>
      <div
        role="button"
        tabIndex={0}
        className="notification__close"
        onClick={() => this.props.dispatch(removeNotificationsById(id))}
      >
        <SVGInline svg={closeIcon} className="notification__close-icon" />
      </div>
    </div>
  );

  render() {
    const { customReady } = this.state;
    const { notifications, visible } = this.props;

    if (notifications.length === 0 || !customReady) return null;

    if (!visible) {
      return null;
    }

    return (
      <div className="notifications">
        {notifications
          .sort((a, b) => b.weight - a.weight)
          .slice(0, 1)
          .map(this.renderNotify)}
      </div>
    );
  }
}
