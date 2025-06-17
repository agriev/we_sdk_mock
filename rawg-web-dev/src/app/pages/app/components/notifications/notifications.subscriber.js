/* eslint-disable camelcase, jsx-a11y/anchor-is-valid */

import React from 'react';
import Pusher from 'pusher-js';
import { FormattedHTMLMessage, FormattedMessage } from 'react-intl';
import { Link } from 'app/components/link';

import config from 'config/config';
import paths from 'config/paths';
import env from 'config/env';

import { allStatusParams, accountsDataByStatus } from 'app/pages/accounts-import/accounts-import.helpers';

import { loadCurrentUser } from 'app/components/current-user/current-user.actions';

import { encode } from 'base-64';
import {
  PUSHER_EMAIL_CONFIRM_ID,
  PUSHER_IMPORT_COMPLETED_ID,
  PUSHER_IMPORT_WAITING_ID,
  PUSHER_FEEDBACK_ID,
  LOCAL_IMPORT_PROGRESS_ID,
} from './notifications.constants';

import {
  addNotification,
  removeNotificationsById,
  NOTIF_STATUS_SUCCESS,
  NOTIF_STATUS_ERROR,
} from './notifications.actions';

const isDev = env.isDev();

class NotificationsSubscriberClass {
  init({ dispatch, pathname, locale }) {
    this.dispatch = dispatch;
    this.pathname = pathname;
    this.locale = locale;
  }

  setPathname = (pathname) => {
    this.pathname = pathname;
  };

  enable({ token, currentUser }) {
    const { locale } = this;

    if (config.apiAddress[locale].includes('dev')) {
      Pusher.logToConsole = true;
    }

    this.currentUser = currentUser;

    const headers = {
      Token: `Token ${token}`,
    };

    if (isDev) {
      headers.Authorization = `Basic ${encode(`${config.rcLogin}:${config.rcPassword}`)}`;
    }

    this.pusher = new Pusher(config.pusherKey, {
      wsHost: config.wsHost,
      encrypted: true,
      authEndpoint: `${config.apiAddress[locale]}/api/pusher/auth`,
      auth: {
        headers,
      },
      enabledTransports: ['ws', 'flash'],
      disabledTransports: ['flash'],
    });

    this.channel = this.pusher.subscribe(`private-${currentUser.username}`);

    this.channel.bind(PUSHER_EMAIL_CONFIRM_ID, this.addEmailConfirmNotification);
    this.channel.bind(PUSHER_IMPORT_COMPLETED_ID, this.addImportCompletedNotification);
    this.channel.bind(PUSHER_IMPORT_WAITING_ID, this.addImportWaitingNotification);
    this.channel.bind(PUSHER_FEEDBACK_ID, this.addFeedbackNotification);

    this.channel.bind('pusher:subscription_succeeded', () => {
      this.channel.trigger('client-connected', {});
    });
  }

  disable() {
    if (!this.channel) return;

    this.channel.unbind(PUSHER_EMAIL_CONFIRM_ID, this.addEmailConfirmNotification);
    this.channel.unbind(PUSHER_IMPORT_COMPLETED_ID, this.addImportCompletedNotification);
    this.channel.unbind(PUSHER_IMPORT_WAITING_ID, this.addImportWaitingNotification);
    this.channel.unbind(PUSHER_FEEDBACK_ID, this.addFeedbackNotification);
  }

  addEmailConfirmNotification = (data) => {
    this.dispatch(loadCurrentUser());

    const { id, status } = data;

    this.dispatch(
      addNotification({
        id,
        notifyPusher: true,
        weight: 3,
        message: <FormattedHTMLMessage id={`shared.notifications_email_confirm_${status}`} />,
        status,
      }),
    );
  };

  trigger(...arguments_) {
    if (this.channel) {
      this.channel.trigger(...arguments_);
    }
  }

  addImportCompletedNotification = (data) => {
    this.dispatch(loadCurrentUser());

    const { id: channelId, is_sync = false } = data;

    const readyPlatforms = [];
    const errorPlatforms = [];

    Object.keys(data).forEach((key) => {
      if (allStatusParams.includes(key)) {
        const platformsArray = data[key] === 'ready' ? readyPlatforms : errorPlatforms;

        platformsArray.push(accountsDataByStatus[key].name);
      }
    });

    const status =
      Array.isArray(readyPlatforms) && readyPlatforms.length > 0 ? NOTIF_STATUS_SUCCESS : NOTIF_STATUS_ERROR;

    const names =
      Array.isArray(readyPlatforms) && readyPlatforms.length > 0
        ? readyPlatforms.join(', ')
        : errorPlatforms.join(', ');

    if (!names) return;

    const getCompletedMessage = () => {
      if (status === NOTIF_STATUS_SUCCESS && this.pathname === paths.rateTopGames) {
        return {
          id: 'shared.notifications_import_ready_rategames',
          values: {
            rateLink: (
              <Link to={paths.rateUserGames}>
                <FormattedMessage id="shared.notifications_import_ready_rategames_link" />
              </Link>
            ),
          },
        };
      }

      if (is_sync) {
        return { id: `shared.notifications_sync_${status}`, values: { names } };
      }

      return { id: `shared.notifications_import_${status}`, values: { names } };
    };

    this.removeImportProgressNotification();
    this.removeImportWaitingNotification();
    this.dispatch(
      addNotification({
        id: PUSHER_IMPORT_COMPLETED_ID,
        channelId,
        notifyPusher: true,
        weight: 5,
        fixed: true,
        autoHideFixed: false,
        message: <FormattedMessage {...getCompletedMessage()} />,
        status,
      }),
    );
  };

  removeImportCompletedNotifications = () => {
    this.dispatch(removeNotificationsById(PUSHER_IMPORT_COMPLETED_ID));
  };

  removeImportProgressNotification = () => {
    this.dispatch(removeNotificationsById(LOCAL_IMPORT_PROGRESS_ID));
  };

  addImportWaitingNotification = ({ position_in_queue, approximate_seconds }) => {
    if (position_in_queue <= 1) {
      return;
    }

    this.removeImportProgressNotification();
    this.dispatch(
      addNotification({
        id: PUSHER_IMPORT_WAITING_ID,
        weight: 5,
        fixed: true,
        status: NOTIF_STATUS_SUCCESS,
        message: (
          <FormattedMessage
            id="shared.notifications_import_progress_queue"
            values={{
              minutes: Math.round(approximate_seconds / 60),
            }}
          />
        ),
      }),
    );
  };

  removeImportWaitingNotification = () => {
    this.dispatch(removeNotificationsById(PUSHER_IMPORT_WAITING_ID));
  };

  addFeedbackNotification = (data) => {
    this.dispatch(loadCurrentUser());

    const { id } = data;

    this.dispatch(
      addNotification({
        id,
        notifyPusher: true,
        message: (
          <FormattedMessage
            id="shared.notifications_feedback"
            values={{
              link: (
                <Link to={paths.feedback} onClick={() => this.dispatch(removeNotificationsById(id))}>
                  <FormattedMessage id="shared.notifications_feedback_link" />
                </Link>
              ),
            }}
          />
        ),
        status: NOTIF_STATUS_SUCCESS,
      }),
    );
  };
}

const NotificationsSubscriber = new NotificationsSubscriberClass();

export default NotificationsSubscriber;
