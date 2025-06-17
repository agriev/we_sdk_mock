import cn from 'classnames';
import React, { useCallback, useEffect, useReducer, useRef, useState, useMemo } from 'react';

import SVGInline from 'react-svg-inline';
import { disableBodyScroll, clearAllBodyScrollLocks } from 'body-scroll-lock';
// import { CSSTransition } from 'react-transition-group';
import { Link } from 'app/components/link';
import { connect } from 'react-redux';
import { compose } from 'recompose';

import { debounce } from 'lodash';
import fetch, { parseCookies } from 'tools/fetch';
import PropTypes from 'prop-types';

import appHelper from 'app/pages/app/app.helper';
import { appSizeType } from 'app/pages/app/app.types';
import currentUserType from 'app/components/current-user/current-user.types';
import SocialLinks from 'app/pages/game/game/social-links';

import denormalizeGame from 'tools/redux/denormalize-game';

import svgBack from './assets/back.svg';
import svgMenuBurger from './assets/menu-burger.svg';
import svgProfileChevron from './assets/profile-chevron.svg';
import svgSearch from './assets/search.svg';
import svgX from './assets/x.svg';

import Logo from '../logo/logo';

import { createAvatar, showIframeModal } from './header.utils';

import { HeaderMenu } from './header.menu';
import { HeaderProfile, HeaderProfileBody } from './header.profile';
import { HeaderSearch } from './header.search';

import './header.styl';
import { HEADER_COIN_COOKIE, HEADER_NOTIFICATION_COOKIE, HeaderCoin, HeaderCoinInformer } from './header.coin';

export const headerPropTypes = {
  isAlternative: PropTypes.bool,
  // className: PropTypes.string,
  currentUser: currentUserType,
  // locale: appLocaleType.isRequired,
  // needsSubheader: PropTypes.bool,
  game: PropTypes.object,
  size: appSizeType.isRequired,
  lastPlayed: PropTypes.array,
  pathname: PropTypes.string,
  recommended: PropTypes.array,
  state: PropTypes.object,
};

/* eslint-disable react/no-this-in-sfc */
// eslint-disable-next-line sonarjs/cognitive-complexity
export const Header = ({
  isAlternative = false,
  currentUser,
  game,
  lastPlayed = [],
  pathname,
  recommended = [],
  state,
  size,
}) => {
  let searchObserver;

  const [searchFocused, setSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [shouldRenderFloatable, setRenderFloatable] = useState(false);
  const [shouldRenderMenu, setRenderMenu] = useState(false);
  const [shouldRenderProfile, setRenderProfile] = useState(false);
  const [shouldRenderSearchDropdown, setRenderSearchDropdown] = useState(false);

  const [shouldRenderCoinInformer, setRenderCoinInformer] = useState(false);
  const [coinState, setCoinState] = useState(false);

  const headerSearchRef = useRef(null);
  const rootRef = useRef(null);

  useEffect(() => {
    const cookies = parseCookies(document.cookie);

    if (!cookies[HEADER_NOTIFICATION_COOKIE]) {
      setCoinState(true);
    }

    if (!cookies[HEADER_COIN_COOKIE] && appHelper.isDesktopSize(size)) {
      setRenderCoinInformer(true);
    }
  }, [size]);

  useEffect(() => {
    if (searchFocused) {
      setRenderSearchDropdown(true);
    }
  }, [searchFocused]);

  function setCoinCookies() {
    const cookies = parseCookies(document.cookie);

    if (!cookies[HEADER_NOTIFICATION_COOKIE]) {
      document.cookie = `${HEADER_NOTIFICATION_COOKIE}=1; Path=/; Secure; SameSite=Lax; Max-Age=${86400}`;
    }

    if (!cookies[HEADER_COIN_COOKIE]) {
      document.cookie = `${HEADER_COIN_COOKIE}=1; Path=/; Secure; SameSite=Lax; Max-Age=${86400 * 7}`;
    }

    setCoinState(false);
  }

  const taskSearch = {
    _reducer: useReducer(
      (prev, next) => {
        return {
          ...prev,
          ...next,

          results: next.results,
        };
      },
      {
        isRunning: false,

        results: {},
        resultsTotal: 0,
      },
    ),

    async perform(query) {
      this.setState({
        isRunning: true,
        resultsTotal: 0,
      });

      const requests = {
        async collections() {
          const { count, results: data } = await fetch('/api/collections?page_size=3', {
            method: 'get',

            data: {
              search: query,
              page: 1,
            },

            state,
          });

          return {
            count,
            data,
          };
        },

        async creators() {
          const { count, results: data } = await fetch('/api/creators?page_size=3', {
            method: 'get',

            data: {
              search: query,
              page: 1,
            },

            state,
          });

          return {
            count,
            data,
          };
        },

        async games() {
          const { count, results: data } = await fetch('/api/games?page_size=3', {
            method: 'get',

            data: {
              search: query,
              page: 1,
            },

            state,
          });

          return {
            count,
            data,
          };
        },

        async personalGames() {
          const { count, results: data } = await fetch('/api/users/current/games?page_size=3', {
            method: 'get',

            data: {
              search: query,
              page: 1,
            },

            state,
          });

          return {
            count,
            data,
          };
        },

        async users() {
          const { count, results: data } = await fetch('/api/users?page_size=3', {
            method: 'get',

            data: {
              search: query,
              page: 1,
            },

            state,
          });

          return {
            count,
            data,
          };
        },
      };

      // eslint-disable-next-line no-use-extend-native/no-use-extend-native
      const results = await Promise.allSettled(
        Object.keys(requests).map((requestKey) => {
          return requests[requestKey]().then((data) => {
            return [requestKey, data];
          });
        }),
      );

      const output = {};
      let total = 0;

      // eslint-disable-next-line no-restricted-syntax
      for (const result of results) {
        if (result.status === 'rejected') {
          // eslint-disable-next-line no-continue
          continue;
        }

        const [key, data] = result.value;
        output[key] = data;

        if (data.count) {
          total += data.count;
        }
      }

      this.setState({
        isRunning: false,

        results: output,
        resultsTotal: total,
      });
    },

    get state() {
      return this._reducer[0];
    },

    setState(value) {
      return this._reducer[1](value);
    },
  };

  const handleSearchQuery = useCallback(
    debounce((query) => {
      taskSearch.perform(query);
    }, 300),
    [],
  );

  function onFloatableClick() {
    if (shouldRenderProfile) {
      return setRenderProfile(false);
    }

    if (searchQuery.length > 0) {
      return setSearchQuery('');
    }

    return setRenderMenu(!shouldRenderMenu);
  }

  function onSearchClear() {
    setSearchQuery('');

    if (headerSearchRef.current) {
      headerSearchRef.current.focus();
    }
  }

  function onSearchBlur() {
    setSearchFocused(false);
  }

  function onSearchFocus() {
    setSearchFocused(true);
    setRenderMenu(true);
  }

  function onSearchChange(event) {
    const { value } = event.currentTarget;

    setSearchQuery(value);
    handleSearchQuery(value);

    if (value.length > 0) {
      taskSearch.setState({
        isRunning: true,
      });
    }
  }

  useEffect(() => {
    if (!shouldRenderMenu) {
      setSearchQuery('');
    }
  }, [shouldRenderMenu]);

  useEffect(() => {
    searchObserver = new IntersectionObserver(([entry]) => {
      if (shouldRenderMenu || shouldRenderProfile) {
        return setRenderFloatable(true);
      }

      setRenderFloatable(!entry.isIntersecting);
    });

    if (headerSearchRef.current) {
      searchObserver.observe(headerSearchRef.current);
    }

    return () => {
      if (searchObserver) {
        searchObserver.disconnect();
      }
    };
  }, [headerSearchRef, shouldRenderMenu, shouldRenderProfile]);

  useEffect(() => {
    if (!currentUser.id) {
      setRenderProfile(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (!rootRef.current || appHelper.isDesktopSize(size)) {
      return clearAllBodyScrollLocks();
    }

    if (shouldRenderMenu || shouldRenderProfile) {
      disableBodyScroll(rootRef.current.querySelector('.header-menu__body-inner'));
    }

    return () => {
      clearAllBodyScrollLocks();
    };
  }, [rootRef.current, shouldRenderMenu, shouldRenderProfile, size]);

  // useEffect(() => {
  //   if (appHelper.isDesktopSize(size)) {
  //     resizeObserver = new ResizeObserver(([entry]) => {
  //       console.log(entry);
  //     });

  //     resizeObserver.observe(rootRef.current);
  //   }

  //   return () => {
  //     resizeObserver && resizeObserver.disconnect();
  //   };
  // }, [rootRef.current, size]);

  const socials = useMemo(() => {
    return {
      text: 'Приглашай друзей – получай награду!',
      textLink: 'https://t.me/agru_gameplatform/1744',

      // customLinks: {
      //   vk: 'https://vk.com/topic-36403380_50015507',
      //   discord: 'https://discord.gg/SpyScEAUeV',
      //   telegram: 'https://t.me/agru_gameplatform/1674',
      // },
    };
  }, []);

  let headerBase = null;

  if (isAlternative) {
    headerBase = (
      <header
        className={cn('header', {
          'header--with-menu': shouldRenderMenu,
          'header--online': game.iframe_url || game.can_play,
          'header--alternative': true,
        })}
        ref={rootRef}
      >
        {appHelper.isPhoneSize(size) ? (
          <div className="header__main">
            <Link to="/" className="header__logo">
              <Logo />
            </Link>

            <div className="header__main-column">
              {currentUser.id ? (
                <>
                  <div
                    className="header__main-avatar"
                    onClick={() => setRenderProfile(true)}
                    role="button"
                    tabIndex={0}
                  >
                    <img
                      src={currentUser.avatar}
                      onError={(event) => {
                        event.currentTarget.src = createAvatar(currentUser.username[0]);
                      }}
                      alt=" "
                    />
                  </div>
                </>
              ) : (
                <button
                  className="header__main-auth"
                  type="button"
                  onClick={() => showIframeModal({ from: 'header', game: game.slug })}
                >
                  Войти
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="header__main">
            <Link to="/" className="header__logo">
              <Logo />
            </Link>

            <div className="header__main-column">
              {currentUser.id ? (
                <>
                  <div
                    className={cn('header__main-profile', {
                      'header__main-profile--active': shouldRenderProfile,
                    })}
                  >
                    <div
                      className="header__main-profile-body"
                      onClick={() => setRenderProfile(!shouldRenderProfile)}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="header__main-profile-avatar">
                        <img
                          src={currentUser.avatar}
                          onError={(event) => {
                            event.currentTarget.src = createAvatar(currentUser.username[0]);
                          }}
                          alt=" "
                        />
                      </div>

                      <SVGInline svg={svgProfileChevron} />
                    </div>

                    <div className="header__main-profile-dropdown">
                      {/* <CSSTransition in={shouldRenderProfile} timeout={200} unmountOnExit classNames="fade"> */}
                      {shouldRenderProfile && (
                        <HeaderProfileBody
                          game={game}
                          currentUser={currentUser}
                          onClickOutside={() => setRenderProfile(false)}
                          pathname={pathname}
                        />
                      )}
                      {/* </CSSTransition> */}
                    </div>
                  </div>
                </>
              ) : (
                <button
                  className="header__main-auth"
                  type="button"
                  onClick={() => showIframeModal({ from: 'header', game: game.slug })}
                >
                  Войти
                </button>
              )}
            </div>
          </div>
        )}
      </header>
    );
  } else {
    headerBase = (
      <header
        className={cn('header', {
          'header--with-menu': shouldRenderMenu,
          'header--online': game.iframe_url || game.can_play,
        })}
        ref={rootRef}
      >
        {appHelper.isPhoneSize(size) ? (
          <div className="header__main">
            <Link to="/" className="header__logo">
              <Logo />
            </Link>

            <div className="header__main-column">
              <div className={cn('header__main-coin', !!currentUser.id && 'header__main-coin--authorized')}>
                <HeaderCoin
                  balance={currentUser.bonus_balance}
                  notification={coinState}
                  onClick={() => {
                    setRenderCoinInformer(true);
                    setCoinCookies();
                  }}
                />

                {shouldRenderCoinInformer && (
                  <HeaderCoinInformer
                    isAuthorized={!!currentUser.id}
                    appSize={size}
                    balance={currentUser.bonus_balance}
                    loyalty={currentUser.loyalty}
                    onClose={() => {
                      setRenderCoinInformer(false);
                      setCoinCookies();
                    }}
                    onRegisterClick={() => showIframeModal({ from: 'header_loyalty', game: game.slug })}
                  />
                )}
              </div>

              {currentUser.id ? (
                <>
                  <div
                    className="header__main-avatar"
                    onClick={() => setRenderProfile(true)}
                    role="button"
                    tabIndex={0}
                  >
                    <img
                      src={currentUser.avatar}
                      onError={(event) => {
                        event.currentTarget.src = createAvatar(currentUser.username[0]);
                      }}
                      alt=" "
                    />
                  </div>
                </>
              ) : (
                <button
                  className="header__main-auth"
                  type="button"
                  onClick={() => showIframeModal({ from: 'header', game: game.slug })}
                >
                  Войти
                </button>
              )}

              <SVGInline svg={svgMenuBurger} className="header__main-burger" onClick={() => setRenderMenu(true)} />
            </div>
          </div>
        ) : (
          <div
            className={cn('header__main', {
              'header__main--focused': searchFocused,
            })}
          >
            <nav className="header__main-nav">
              <Link
                to="/"
                className={cn({
                  active: pathname === '/',
                })}
              >
                Главная
              </Link>

              <Link
                to="/reviews"
                className={cn({
                  active: pathname === '/reviews',
                })}
              >
                Рецензии
              </Link>

              <Link
                to="/games"
                className={cn({
                  active: pathname === '/games',
                })}
              >
                Все игры
              </Link>
            </nav>

            {appHelper.isDesktopSize(size) && <SocialLinks isHeader {...socials} />}

            <div className="header__main-column">
              <div className="header__main-search">
                <div className="header__search-unhider">
                  <SVGInline svg={svgSearch} onClick={() => headerSearchRef.current.focus()} />
                </div>

                <div className="header__search header__search--from-header">
                  <input
                    value={searchQuery}
                    onChange={onSearchChange}
                    type="text"
                    name="search"
                    placeholder="Поиск.."
                    onFocus={onSearchFocus}
                    ref={headerSearchRef}
                  />

                  <SVGInline svg={svgX} className="header__search-x" onClick={onSearchClear} />
                  <SVGInline svg={svgSearch} className="header__search-search" />
                </div>

                {/* <CSSTransition in={searchQuery.length > 0} timeout={200} unmountOnExit classNames="fade"> */}
                {shouldRenderSearchDropdown && (
                  <HeaderSearch
                    className="header__main-search-dropdown"
                    isRunning={taskSearch.state.isRunning}
                    results={taskSearch.state.results}
                    resultsTotal={taskSearch.state.resultsTotal}
                    renderResultsTotal
                    query={searchQuery}
                    inputRef={headerSearchRef}
                    onClick={() => setSearchFocused(true)}
                    onClickOutside={() => {
                      setSearchFocused(false);
                      setRenderSearchDropdown(false);
                    }}
                  />
                )}
                {/* </CSSTransition> */}
              </div>

              <div className={cn('header__main-coin', !!currentUser.id && 'header__main-coin--authorized')}>
                <HeaderCoin
                  balance={currentUser.bonus_balance}
                  notification={coinState}
                  onClick={() => {
                    setRenderCoinInformer(true);
                    setCoinCookies();
                  }}
                />

                {shouldRenderCoinInformer && (
                  <HeaderCoinInformer
                    isAuthorized={!!currentUser.id}
                    appSize={size}
                    balance={currentUser.bonus_balance}
                    loyalty={currentUser.loyalty}
                    onRegisterClick={() => showIframeModal({ from: 'header_loyalty', game: game.slug })}
                    onClose={() => {
                      setRenderCoinInformer(false);
                      setCoinCookies();
                    }}
                  />
                )}
              </div>

              {currentUser.id ? (
                <>
                  <div
                    className={cn('header__main-profile', {
                      'header__main-profile--active': shouldRenderProfile,
                    })}
                  >
                    <div
                      className="header__main-profile-body"
                      onClick={() => setRenderProfile(!shouldRenderProfile)}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="header__main-profile-avatar">
                        <img
                          src={currentUser.avatar}
                          onError={(event) => {
                            event.currentTarget.src = createAvatar(currentUser.username[0]);
                          }}
                          alt=" "
                        />
                      </div>

                      <SVGInline svg={svgProfileChevron} />
                    </div>

                    <div className="header__main-profile-dropdown">
                      {/* <CSSTransition in={shouldRenderProfile} timeout={200} unmountOnExit classNames="fade"> */}
                      {shouldRenderProfile && (
                        <HeaderProfileBody
                          game={game}
                          currentUser={currentUser}
                          onClickOutside={() => setRenderProfile(false)}
                          pathname={pathname}
                        />
                      )}
                      {/* </CSSTransition> */}
                    </div>
                  </div>
                </>
              ) : (
                <button
                  className="header__main-auth"
                  type="button"
                  onClick={() => showIframeModal({ from: 'header', game: game.slug })}
                >
                  Войти
                </button>
              )}
            </div>
          </div>
        )}

        {appHelper.isPhoneSize(size) && (
          <div className="header__searchable">
            <div className="header__search">
              <input
                value={searchQuery}
                onChange={onSearchChange}
                type="text"
                name="search"
                placeholder="Поиск.."
                onBlur={onSearchBlur}
                onFocus={onSearchFocus}
                ref={headerSearchRef}
              />

              <SVGInline svg={svgX} className="header__search-x" onClick={onSearchClear} />
              <SVGInline svg={svgSearch} className="header__search-search" />
            </div>
          </div>
        )}
      </header>
    );
  }

  return (
    <>
      {!isAlternative && appHelper.isPhoneSize(size) && <SocialLinks isHeader {...socials} />}

      {headerBase}

      {appHelper.isPhoneSize(size) && (
        <>
          {/* <CSSTransition in={shouldRenderMenu} timeout={200} unmountOnExit classNames="fade"> */}
          {shouldRenderMenu && (
            <HeaderMenu
              currentUser={currentUser}
              lastPlayed={lastPlayed}
              pathname={pathname}
              onProfileClick={() => setRenderProfile(true)}
              recommended={recommended}
              searchQuery={searchQuery}
              searchRunning={taskSearch.state.isRunning}
              searchResults={taskSearch.state.results}
              searchResultsTotal={taskSearch.state.resultsTotal}
            />
          )}
          {/* </CSSTransition> */}

          {/* <CSSTransition in={shouldRenderProfile} timeout={200} unmountOnExit classNames="header-fade-profile"> */}
          {shouldRenderProfile && (
            <HeaderProfile
              game={game}
              pathname={pathname}
              onClickOutside={() => setRenderProfile(false)}
              currentUser={currentUser}
            />
          )}
          {/* </CSSTransition> */}

          {/* <CSSTransition in={shouldRenderFloatable} timeout={200} unmountOnExit classNames="fade"> */}
          {shouldRenderFloatable && (
            <div
              className={cn('header-menu-floatable', {
                'header-menu-floatable--active': shouldRenderMenu || shouldRenderProfile,
                'header-menu-floatable--back': shouldRenderMenu && shouldRenderProfile,
              })}
              onClick={onFloatableClick}
              role="button"
              tabIndex={0}
            >
              <SVGInline svg={svgMenuBurger} />
              <SVGInline svg={svgX} />
              <SVGInline svg={svgBack} />
            </div>
          )}
          {/* </CSSTransition> */}
        </>
      )}
    </>
  );
};

const hoc = compose(
  connect((state) => ({
    currentUser: state.currentUser,
    lastPlayed: state.discover.lastPlayed,
    locale: state.app.locale,
    size: state.app.size,
    recommended: state.discover.recommended,
    game: denormalizeGame(state),
    state,
  })),
);

Header.propTypes = headerPropTypes;
export default hoc(Header);
