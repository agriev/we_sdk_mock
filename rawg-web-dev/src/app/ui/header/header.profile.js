import React, { useEffect, useRef, useState } from 'react';
import cn from 'classnames';
import SVGInline from 'react-svg-inline';
import { Link } from 'app/components/link';

import PropTypes from 'prop-types';

import currentUserType from 'app/components/current-user/current-user.types';
import { useDispatch } from 'react-redux';
import { CURRENT_USER_LOGOUT } from 'app/components/current-user/current-user.actions';
import { loadDiscoverLastPlayed, loadDiscoverRecommended } from 'app/pages/discover/discover.actions';
import { isFlutter } from 'tools/is-flutter';
import { dispatchCustomEvent } from 'tools/dispatch-custom-event';
import { TOGGLE_PROFILE_IFRAME_VISIBILITY } from 'app/pages/app/app.actions';
import { createAvatar, showIframeModal } from './header.utils';

import svgAddGame from './assets/profile/add-game.svg';
import svgCollections from './assets/profile/collections.svg';
import svgFeedback from './assets/profile/feedback.svg';
import svgNotifications from './assets/profile/notifications.svg';
import svgSettings from './assets/profile/settings.svg';
import svgExit from './assets/profile/exit.svg';
import svgUser from './assets/profile/user.svg';
import { HEADER_COIN_COOKIE, HEADER_NOTIFICATION_COOKIE } from './header.coin';

const isFlutterMode = typeof navigator !== 'undefined' && isFlutter(navigator.userAgent);

export const HeaderProfileBody = ({ game, currentUser, onClickOutside, pathname }) => {
  if (!currentUser) {
    return null;
  }

  const [isMounted, setMounted] = useState(false);
  const rootRef = useRef(null);

  const dispatch = useDispatch();
  const shouldRefresh = pathname !== '/pay' && !game.seamless_auth;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function onWindowClick(event) {
      if (!rootRef.current || !isMounted) {
        return;
      }

      if (rootRef.current.contains(event.target)) {
        return;
      }

      onClickOutside();
    }

    window.addEventListener('click', onWindowClick);

    return () => {
      window.removeEventListener('click', onWindowClick);
    };
  }, [isMounted, rootRef]);

  async function logout() {
    document.cookie = `${HEADER_COIN_COOKIE}=; path=/; expires=${new Date(0).toUTCString()}`;
    document.cookie = `${HEADER_NOTIFICATION_COOKIE}=; path=/; expires=${new Date(0).toUTCString()}`;

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
  }

  const generatedAvatar = createAvatar(currentUser.username[0]);

  return (
    <div className="header-profile__root" ref={rootRef}>
      <div className="header-profile__user">
        <Link to={`/@${currentUser.username}`}>
          <img
            className="header-profile__user-avatar"
            src={currentUser.avatar || generatedAvatar}
            alt=" "
            onError={(event) => {
              event.currentTarget.src = generatedAvatar;
            }}
          />
        </Link>

        <div className="header-profile__user-info">
          <Link to={`/@${currentUser.username}`} className="header-profile__user-name">
            {currentUser.username}
          </Link>

          <a
            className="header-profile__user-settings"
            onClick={() => showIframeModal({ auth: true })}
            role="button"
            tabIndex={0}
          >
            Управление аккаунтом
          </a>
        </div>
      </div>

      {!isFlutterMode && (
        <div className="header-profile__menu">
          <Link
            className={cn('header-profile__entry', {
              'header-profile__entry--active': pathname === `/@${currentUser.username}`,
            })}
            to={`/@${currentUser.username}`}
          >
            <SVGInline svg={svgUser} />
            Моя страница
          </Link>

          <Link
            className={cn('header-profile__entry', {
              'header-profile__entry--active': pathname === '/notifications',
            })}
            to="/notifications"
          >
            <SVGInline svg={svgNotifications} />
            Уведомления
          </Link>

          <Link
            className={cn('header-profile__entry', {
              'header-profile__entry--active': pathname === '/collections/create',
            })}
            to="/collections/create"
          >
            <SVGInline svg={svgCollections} />
            Создать коллекцию
          </Link>

          <Link
            className={cn('header-profile__entry', {
              'header-profile__entry--active': pathname === '/search',
            })}
            to="/search"
          >
            <SVGInline svg={svgAddGame} />
            Добавить игру
          </Link>

          <Link
            className={cn('header-profile__entry', {
              'header-profile__entry--active': pathname === '/settings',
            })}
            to="/settings"
          >
            <SVGInline svg={svgSettings} />
            Настройки
          </Link>

          <Link
            className={cn('header-profile__entry', {
              'header-profile__entry--active': pathname === '/feedback',
            })}
            to="/feedback"
          >
            <SVGInline svg={svgFeedback} />
            Обратная связь
          </Link>
        </div>
      )}

      <footer className="header-profile__footer">
        <div className="header-profile__entry header-profile__entry--exit" onClick={() => logout()}>
          <SVGInline svg={svgExit} />
          Выйти
        </div>
      </footer>
    </div>
  );
};

export const HeaderProfile = (props) => {
  if (!props.currentUser) {
    return null;
  }

  return (
    <div className="header-profile">
      <HeaderProfileBody {...props} />
    </div>
  );
};

// eslint-disable-next-line no-multi-assign
HeaderProfileBody.propTypes = HeaderProfile.propTypes = {
  currentUser: currentUserType,
  onClickOutside: PropTypes.func,
  pathname: PropTypes.string,
  game: PropTypes.object,
};
