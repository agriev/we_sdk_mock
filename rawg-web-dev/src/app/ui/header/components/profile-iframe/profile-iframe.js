import React, { useCallback, useEffect, useRef, useState } from 'react';
import config from 'config/config';
import { iframeResizer } from 'iframe-resizer';
import CloseButton from 'app/ui/close-button';
import classnames from 'classnames';
import { disableBodyScroll, clearAllBodyScrollLocks } from 'body-scroll-lock';
import Loading from 'app/ui/loading/loading';

import './profile-iframe.styl';
import { connect, useDispatch } from 'react-redux';
import PropTypes from 'prop-types';
import { loadCurrentUser, CURRENT_USER_LOGOUT } from 'app/components/current-user/current-user.actions';
import { loadDiscoverLastPlayed, loadDiscoverRecommended } from 'app/pages/discover/discover.actions';
import { dispatchCustomEvent } from '../../../../../tools/dispatch-custom-event';
import { TOGGLE_PROFILE_IFRAME_VISIBILITY } from '../../../../pages/app/app.actions';
import { currentUserIdType } from '../../../../components/current-user/current-user.types';

const propTypes = {
  currentUserId: currentUserIdType.isRequired,
  profileIframeVisibility: PropTypes.string,
  profileIframeCallback: PropTypes.func,
  game: PropTypes.object,
  pathname: PropTypes.string,
};

const defaultProps = {};

export const PATHS_TO_NOT_REFRESH = new Set([
  '/games/amatsutsumi',
  '/games/farming-fever',
  '/games/fanwars',
  '/games/rogalia',
  '/games/chaos-lords',
  '/games/galaxy-control',
  '/games/galaxy-control-3d-strategy',
  '/games/boevaia-arena',
  '/games/dragon-lords-3d',
]);

const ProfileIframe = ({ game, currentUserId, pathname, profileIframeCallback, profileIframeVisibility }) => {
  const iframeRef = useRef(null);
  const authIframeWrapRef = useRef(null);

  const [isLoaded, setLoaded] = useState(false);
  const dispatch = useDispatch();

  const [showClose, setShowClose] = useState(false);
  const shouldRefresh = pathname !== '/pay' && !game.seamless_auth;

  const iframeMessageHandler = useCallback(
    (e) => {
      const handlers = {
        async logout_parent() {
          document.cookie = `gsid_rc=; path=/; domain=.dev.ag.ru; expires=${new Date(0).toUTCString()}`;
          document.cookie = `gsid=; path=/; domain=.ag.ru; expires=${new Date(0).toUTCString()}`;

          if (shouldRefresh) {
            return window.location.reload();
          }

          dispatch({
            type: CURRENT_USER_LOGOUT,
          });

          // eslint-disable-next-line no-use-extend-native/no-use-extend-native
          await Promise.allSettled([dispatch(loadDiscoverRecommended()), dispatch(loadDiscoverLastPlayed())]);

          dispatchCustomEvent({
            el: document,
            eventName: TOGGLE_PROFILE_IFRAME_VISIBILITY,
            detail: {
              state: '',
            },
          });
        },

        async reload_parent() {
          if (shouldRefresh) {
            return window.location.reload();
          }

          dispatch(loadCurrentUser());

          // eslint-disable-next-line no-use-extend-native/no-use-extend-native
          await Promise.allSettled([dispatch(loadDiscoverRecommended()), dispatch(loadDiscoverLastPlayed())]);

          dispatchCustomEvent({
            el: document,
            eventName: TOGGLE_PROFILE_IFRAME_VISIBILITY,
            detail: {
              state: '',
            },
          });

          if (typeof profileIframeCallback === 'function') {
            profileIframeCallback();
          }
        },

        save_parent() {
          if (shouldRefresh) {
            return window.location.reload();
          }

          dispatchCustomEvent({
            el: document,
            eventName: TOGGLE_PROFILE_IFRAME_VISIBILITY,
            detail: {
              state: '',
            },
          });
        },
      };

      if (e.data === 'agru-window-close') {
        return dispatchCustomEvent({
          el: document,
          eventName: TOGGLE_PROFILE_IFRAME_VISIBILITY,
          detail: {
            state: '',
          },
        });
      }

      if (typeof e.data === 'string' && e.data.startsWith('[iFrameSizer]')) {
        setShowClose(true);
      }

      if (e.data && e.data.type === 'url') {
        window.location.href = e.data.data;
        return;
      }

      if (e.data in handlers) {
        return handlers[e.data]();
      }
    },
    [game],
  );

  useEffect(() => {
    if (iframeRef.current && authIframeWrapRef.current) {
      iframeResizer({ log: false }, iframeRef.current);
      authIframeWrapRef.current.classList.add('profile-iframe_show');
      disableBodyScroll(authIframeWrapRef.current);
    }

    window.addEventListener('message', iframeMessageHandler, false);

    return () => {
      window.removeEventListener('message', iframeMessageHandler, false);
      clearAllBodyScrollLocks();
    };
  }, [isLoaded]);

  useEffect(() => {
    if (!iframeRef.current || !showClose) {
      return;
    }

    iframeRef.current.style.maxWidth = '488px';
  }, [iframeRef, showClose]);

  const onCloseHandler = useCallback(() => {
    dispatchCustomEvent({
      el: document,
      eventName: TOGGLE_PROFILE_IFRAME_VISIBILITY,
      detail: {
        state: '',
      },
    });
  }, []);

  return (
    <div
      ref={authIframeWrapRef}
      className={classnames('profile-iframe', {
        'profile-iframe_loaded': isLoaded,
      })}
    >
      {showClose && (
        <div className="profile-iframe__head">
          <CloseButton onClick={onCloseHandler} />
        </div>
      )}

      <div className="profile-iframe__loader">
        <Loading size="medium" />
      </div>

      <iframe
        ref={iframeRef}
        id="ag_auth_iframe"
        scrolling="no"
        name="test"
        title="Авторизация на сайте"
        src={profileIframeVisibility || config.registerLink}
        className={classnames({ isLogin: !!currentUserId })}
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
};

ProfileIframe.propTypes = propTypes;
ProfileIframe.defaultProps = defaultProps;

export default connect((state) => {
  return {
    currentUserId: state.currentUser.id,
    profileIframeVisibility: state.app.profileIframeVisibility,
    profileIframeCallback: state.app.profileIframeCallback,
  };
})(ProfileIframe);
