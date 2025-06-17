import { AgRuSdkMethods } from '@agru/sdk';

import config from 'config/config';
import { dispatchCustomEvent } from 'tools/dispatch-custom-event';

import { logout } from 'app/components/current-user/current-user.actions';
import { TOGGLE_PROFILE_IFRAME_VISIBILITY } from '../../app.actions';

export function useSDKAuthorization(context) {
  return {
    handleAuthorize,
    handleLogout,
  };

  function onProfileIframeChange(e) {
    if (!e.detail.state) {
      document.removeEventListener(TOGGLE_PROFILE_IFRAME_VISIBILITY, onProfileIframeChange);
    }

    const isVisible = !!e.detail.state;

    context.iframeSource.postMessage(
      {
        data: [isVisible, null],
        type: AgRuSdkMethods.Authorize,
      },
      '*',
    );

    if (!isVisible) {
      context.iframeSource.postMessage(
        {
          data: [!!context.state.currentUserId, null],
          type: AgRuSdkMethods.AuthorizeAndWait,
        },
        '*',
      );
    }
  }

  function handleAuthorize() {
    if (context.props.currentUser.id) {
      return onProfileIframeChange({ detail: { state: '' } });
    }

    const url = new URL(config.registerLink);
    url.searchParams.set('from', 'iframe');

    document.addEventListener(TOGGLE_PROFILE_IFRAME_VISIBILITY, onProfileIframeChange);

    dispatchCustomEvent({
      el: document,
      eventName: TOGGLE_PROFILE_IFRAME_VISIBILITY,
      detail: {
        state: url.toString(),
      },
    });
  }

  async function handleLogout() {
    const { currentUser, location, game } = context.props;

    if (!currentUser.id) {
      return;
    }

    const shouldRefresh = location.pathname !== '/pay' && !game.seamless_auth;

    document.cookie = `gsid_rc=; path=/; domain=.dev.ag.ru; expires=${new Date(0).toUTCString()}`;
    document.cookie = `gsid=; path=/; domain=.ag.ru; expires=${new Date(0).toUTCString()}`;

    if (shouldRefresh) {
      return window.location.reload();
    }

    context.props.dispatch(logout());

    context.iframeSource.postMessage(
      {
        data: [true, null],
        type: AgRuSdkMethods.Logout,
      },
      '*',
    );
  }
}
