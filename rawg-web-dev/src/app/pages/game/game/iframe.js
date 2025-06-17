import React, { useState, useRef, useEffect, useMemo, useReducer } from 'react';
import fullscreenIcon from 'assets/icons/fullscreen.svg';
import gameHelpIcon from 'assets/icons/game-help.svg';
import SVGInline from 'react-svg-inline';
import cn from 'classnames';

import appHelper from 'app/pages/app/app.helper';
import { connect } from 'react-redux';
import { pure } from 'recompose';
import { appSizeType } from 'app/pages/app/app.types';
import PropTypes from 'prop-types';
// import Loading from 'app/ui/loading/loading';
import ProfileIframe from 'app/ui/header/components/profile-iframe/profile-iframe';
import { AgRuSdkMethods } from '@agru/sdk';
import { showIframeModal } from 'app/ui/header/header.utils';
import logoIcon from 'app/ui/logo/assets/ag-logo.svg';
import logoIconSmall from 'app/ui/logo/assets/ag-logo-small.svg';
import { isFlutter } from 'tools/is-flutter';
import { iframe as iframeType, name as nameType, id as gameId } from '../game.types';

import GameCampaignBlock from './campaign';
import SocialLinks from './social-links';

import backIcon from './assets/back.svg';
import closeIcon from './assets/close.svg';
import saveIcon from './assets/save.svg';

import splashDesktop1 from './assets/splash-d-1.svg';
import splashDesktop2 from './assets/splash-d-2.svg';
import splashMobile1 from './assets/splash-m-1.svg';
import splashMobile2 from './assets/splash-m-2.svg';
import GamePayment from './payment';

const BOOKMARK_SHOW_TIME = 10e3;
const BACK_CLOSE_TIME = 5e3;
const INFORMER_CLOSE_TIME = 5e3;
const INFORMER_SHOW_TIME = 60e4;
const DEFAULT_AUTH_DELAY_TIME = 30e4;

function createTimer(callback, delay) {
  let remaining = delay;
  let start;
  let timerId;

  function pause() {
    clearTimeout(timerId);
    remaining -= new Date().getTime() - start;
  }

  function resume() {
    start = new Date();
    clearTimeout(timerId);
    timerId = window.setTimeout(callback, remaining);
  }

  resume();

  return {
    pause,
    resume,
    timerId,
  };
}

const gameIframeBlockPropertyTypes = {
  adfox: PropTypes.array,
  authDelay: PropTypes.object,
  banner: PropTypes.node,
  currentUser: PropTypes.object,
  iframeSrc: iframeType,
  name: nameType,
  id: gameId,
  size: appSizeType,
  cover: PropTypes.string,
  profileIframeVisibility: PropTypes.string,
  pwaMode: PropTypes.bool,
  customParams: PropTypes.string,
  game: PropTypes.object,
};

const gameIframeBlockDefaultProperties = {
  iframeSrc: '',
  name: '',
};

const isFlutterMode = typeof navigator !== 'undefined' && isFlutter(navigator.userAgent);

// eslint-disable-next-line sonarjs/cognitive-complexity
const GameIframe = ({
  adfox,
  authDelay,
  banner,
  customParams = '',
  currentUser,
  cover,
  iframeSrc,
  name,
  game,
  id,
  pwaMode,
  size,
  profileIframeVisibility,
}) => {
  if (!iframeSrc) {
    return null;
  }

  const [isStarted, setStarted] = useState(false);
  const [isStretched, setStretched] = useState(false);

  const [isFullscreen, setFullscreen] = useState(false);

  const [bookmarkState, setBookmarkState] = useReducer((prev, next) => ({ ...prev, ...next }), {
    shouldRenderFloatable: false,
    timer: 0,
  });

  const [paymentState, setPaymentState] = useReducer((prev, next) => ({ ...prev, ...next }), {
    shouldRender: false,
    token: '',
  });

  const [informerState, setInformerState] = useReducer(
    (prev, next) => {
      return {
        ...prev,
        ...next,
      };
    },
    {
      hasInteracted: false,

      isOpened: true,
      shouldRender: false,

      timerInteract: 0,
      timerRender: 0,
    },
  );

  const [backState, setBackState] = useReducer(
    // eslint-disable-next-line sonarjs/no-identical-functions
    (prev, next) => {
      return {
        ...prev,
        ...next,
      };
    },
    {
      hasInteracted: false,
      isOpened: true,
      timerInteract: 0,
    },
  );

  const [authDelayState, setAuthDelayState] = useReducer(
    (prev, next) => {
      return { ...prev, ...next };
    },
    {
      timer: null,
      wasTrigged: false,
    },
  );

  const [isLoaded, setIsLoaded] = useState(false);

  const iframeRef = useRef();
  const rootRef = useRef();

  const computedIframeSrc = useMemo(() => {
    if (!customParams) {
      return iframeSrc;
    }

    const newParams = new URLSearchParams(customParams);
    const url = new URL(iframeSrc);

    // eslint-disable-next-line no-restricted-syntax
    for (const [key, value] of newParams) {
      if (value) {
        url.searchParams.set(key, value);
      }
    }

    return url.toString();
  }, [customParams, iframeSrc]);

  function cancelFullscreen() {
    try {
      return (document.webkitExitFullscreen || document.exitFullscreen || function() {}).call(document);
    } catch {
      //
    }
  }

  function goFullscreen() {
    try {
      if (game.alternative_fullscreen) {
        return setStretched(true);
      }

      if (!rootRef.current) {
        return;
      }

      return (rootRef.current.webkitRequestFullscreen || rootRef.current.requestFullscreen || function() {}).call(
        rootRef.current,
      );
    } catch {
      //
    }
  }

  // function isFullscreen() {
  //   let value = false;

  //   if ('webkitCurrentFullScreenElement' in document) {
  //     value = !!document.webkitCurrentFullScreenElement;
  //   } else {
  //     value = !!document.fullscreenElement;
  //   }

  //   return value;
  // }

  function onOverlayClick() {
    if (appHelper.isDesktopSize(size)) {
      return;
    }

    setStarted(true);
    setStretched(true);
  }

  function onLoad() {
    if (!isStarted) {
      return;
    }

    setIsLoaded(true);

    if (typeof window.yaCounter === 'object') {
      window.yaCounter.reachGoal('played');
    }

    if (window.gtag) {
      window.gtag('event', 'played_game', {
        page_title: document.title,
      });
    }
  }

  function onMessage(event) {
    const payload = event.data;

    if (typeof payload !== 'object' || Array.isArray(payload)) {
      return;
    }

    const { data, type } = payload;

    if (Array.isArray(data)) {
      return;
    }

    const handlers = {
      [AgRuSdkMethods.ShowPayment]() {
        setPaymentState({ shouldRender: true, token: data });
      },

      [AgRuSdkMethods.ToggleFullscreen]() {
        if (appHelper.isPhoneSize(size) || game.alternative_fullscreen) {
          setStretched(!isStretched);
        } else {
          // eslint-disable-next-line no-unused-expressions
          isFullscreen ? cancelFullscreen() : goFullscreen();
        }

        event.source.postMessage(
          {
            data: [true, null],
            type: AgRuSdkMethods.ToggleFullscreen,
          },
          '*',
        );
      },
    };

    if (handlers[type]) {
      handlers[type]();
    }
  }

  useEffect(() => {
    // eslint-disable-next-line no-unused-expressions
    if (isStretched) {
      Object.assign(document.body.style, {
        overflow: 'hidden',
        position: 'fixed',
        top: '0',
        left: '0',
      });
    } else {
      document.body.removeAttribute('style');
    }

    window.addEventListener('message', onMessage);

    return () => {
      window.removeEventListener('message', onMessage);
      document.body.removeAttribute('style');
    };
  }, [isStretched, isFullscreen]);

  useEffect(() => {
    if (!isStarted) {
      if (appHelper.isPhoneSize(size)) {
        setStarted(pwaMode || game.play_on_mobile);
        setStretched(pwaMode || game.play_on_mobile);
        return;
      }

      setStarted(true);
    }
  }, [game, size, pwaMode]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!isLoaded) {
          return;
        }

        document.dispatchEvent(new CustomEvent('game-in-viewport', { detail: entry.intersectionRatio > 0 }));
      },
      {
        threshold: Array.from({ length: 11 }, (_, i) => i / 10),
      },
    );

    if (rootRef.current) {
      observer.observe(rootRef.current);
    }

    return () => {
      if (observer) {
        observer.disconnect();
      }
    };
  }, [rootRef, isLoaded]);

  useEffect(() => {
    if (informerState.hasInteracted || !isStarted || !informerState.shouldRender) {
      clearTimeout(informerState.timerInteract);
      return;
    }

    setInformerState({
      timerInteract: setTimeout(() => {
        setInformerState({
          isOpened: false,
        });
      }, INFORMER_CLOSE_TIME),
    });

    return () => {
      clearTimeout(informerState.timerInteract);
    };
  }, [informerState.hasInteracted, informerState.shouldRender, isStarted]);

  useEffect(() => {
    if (!isStarted || informerState.shouldRender) {
      return;
    }

    setInformerState({
      timerRender: setTimeout(() => {
        setInformerState({
          shouldRender: true,
        });
      }, INFORMER_SHOW_TIME),
    });

    return () => {
      clearTimeout(informerState.timerInteract);
    };
  }, [informerState.shouldRender, isStarted]);

  useEffect(() => {
    if (backState.hasInteracted || !isStarted) {
      clearTimeout(backState.timerInteract);
      return;
    }

    setBackState({
      // eslint-disable-next-line sonarjs/no-identical-functions
      timerInteract: setTimeout(() => {
        setBackState({
          isOpened: false,
        });
      }, BACK_CLOSE_TIME),
    });

    return () => {
      clearTimeout(backState.timerInteract);
    };
  }, [backState.hasInteracted, isStarted]);

  useEffect(() => {
    setBookmarkState({
      timer: setTimeout(() => {
        setBookmarkState({ shouldRenderFloatable: true });
      }, BOOKMARK_SHOW_TIME),
    });

    return () => {
      clearTimeout(bookmarkState.timer);
    };
  }, []);

  function onVisibilityChange() {
    if (authDelayState.timer) {
      authDelayState.timer[document.visibilityState === 'hidden' ? 'pause' : 'resume']();
    }
  }

  useEffect(() => {
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [authDelayState]);

  useEffect(() => {
    if (currentUser.id || game.slug.includes('mad-world')) {
      return () => {
        if (authDelayState.timer) {
          clearTimeout(authDelayState.timer.timerId);
        }
      };
    }

    // eslint-disable-next-line react/prop-types
    let time = appHelper.isPhoneSize(size) ? authDelay.mobile : authDelay.desktop;

    if (time) {
      time = Number(`${time}e3`);
    } else {
      time = DEFAULT_AUTH_DELAY_TIME;
    }

    setAuthDelayState({
      timer: createTimer(() => {
        if (currentUser.id || profileIframeVisibility) {
          if (authDelayState.timer) {
            clearTimeout(authDelayState.timer.timerId);
            authDelayState.timer.pause();
          }

          return;
        }

        showIframeModal({ auth: false, from: 'iframe_auth_delay', game: game.slug });
        setAuthDelayState({ wasTrigged: true });
      }, time),
    });
  }, [currentUser, game, size]);

  useEffect(() => {
    if (currentUser.id || profileIframeVisibility) {
      if (authDelayState.timer) {
        clearTimeout(authDelayState.timer.timerId);
      }
    }

    return () => {
      if (authDelayState.timer) {
        clearTimeout(authDelayState.timer.timerId);
      }
    };
  }, [profileIframeVisibility, currentUser, authDelayState]);

  const backStyle = useMemo(() => {
    const { exit_button_position: position } = game;

    if (!Array.isArray(position)) {
      return null;
    }

    const [left, top] = position;

    return {
      left,
      top,
    };
  }, [game]);

  function onFullscreenChange() {
    setFullscreen(
      document['webkitFullscreenElement' in document ? 'webkitFullscreenElement' : 'fullscreenElement'] ===
        rootRef.current,
    );
  }

  useEffect(() => {
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);
    document.addEventListener('fullscreenchange', onFullscreenChange);

    return () => {
      document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
    };
  }, []);

  let iframeFocusTimeout;

  useEffect(() => {
    if (!iframeRef.current) {
      return;
    }

    iframeFocusTimeout = setInterval(() => {
      const tag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';

      if (tag === 'iframe' || tag === 'input') {
        return;
      }

      iframeRef.current.contentWindow.focus();
    }, 300);

    return () => {
      clearInterval(iframeFocusTimeout);
    };
  }, [isStarted, iframeRef]);

  const iframeBackground = useMemo(() => {
    if (pwaMode) {
      return;
    }

    if (!cover) {
      return;
    }

    return { backgroundImage: `url(${cover})` };
  }, [pwaMode, cover]);

  return (
    <div className="game__iframe-wrapper">
      <section
        className={cn('game__iframe', {
          'game__iframe--is-streched': isStretched,
          'game__iframe--is-pwa': pwaMode,
          'game__iframe--is-fullscreen': isFullscreen,
        })}
        ref={rootRef}
      >
        {isStarted ? (
          <>
            <iframe
              allowFullScreen
              scrolling="no"
              frameBorder="0"
              title={name}
              src={computedIframeSrc}
              id={`iframe_${id}`}
              onLoad={onLoad}
              webkitallowfullscreen="true"
              mozallowfullscreen="true"
              ref={iframeRef}
            />

            {isStretched && !pwaMode && (
              <>
                {/* {!isLoaded && <Loading className="game__iframe-loader" size="medium" />} */}

                <div
                  className={cn('game__iframe-back', {
                    'game__iframe-back--closed': !backState.isOpened,
                  })}
                  role="button"
                  tabIndex={0}
                  style={backStyle}
                  onClick={() => {
                    if (appHelper.isPhoneSize(size)) {
                      window.location.href = '/';
                      return;
                    }

                    if (backState.isOpened) {
                      setStretched(false);

                      setBackState({
                        hasInteracted: false,
                        isOpened: false,
                      });

                      return clearInterval(backState.timerInteract);
                    }

                    setBackState({
                      isOpened: true,

                      // eslint-disable-next-line sonarjs/no-identical-functions
                      timerInteract: setTimeout(() => {
                        setBackState({
                          isOpened: false,
                        });
                      }, BACK_CLOSE_TIME),
                    });
                  }}
                >
                  <div className="game__iframe-back__back">
                    <SVGInline svg={backIcon} />
                  </div>

                  <div className="game__iframe-back__body">
                    <SVGInline svg={logoIconSmall} className="game__iframe-back__logo" />

                    <div className="game__iframe-back__body-text">
                      <span>Выйти из игры</span>
                    </div>
                  </div>

                  <div
                    className="game__iframe-back__close"
                    role="button"
                    tabIndex={0}
                    onClick={(event) => {
                      event.stopPropagation();

                      setBackState({ hasInteracted: true, isOpened: false });
                      clearTimeout(backState.timerInteract);
                    }}
                  >
                    <SVGInline svg={closeIcon} />
                  </div>
                </div>
              </>
            )}

            {!currentUser.id && informerState.shouldRender && (
              <div
                className={cn('game__iframe-informer', {
                  'game__iframe-informer--closed': !informerState.isOpened,
                })}
                onClick={() => {
                  showIframeModal({ auth: false, from: 'ingame-button' });
                }}
                role="button"
                tabIndex={0}
              >
                <div className="game__iframe-informer__body">
                  <SVGInline svg={saveIcon} />

                  <div className="game__iframe-informer__body-text">
                    <span>Сохрани игру</span>
                  </div>
                </div>

                {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
                <div
                  className="game__iframe-informer__close"
                  onClick={(event) => {
                    event.stopPropagation();

                    setInformerState({
                      hasInteracted: true,
                      isOpened: false,
                    });
                  }}
                >
                  <SVGInline svg={closeIcon} />
                </div>
              </div>
            )}

            <div className="game__iframe-splash">
              <div className="game__iframe-splash-content">
                <SVGInline className="game__iframe-splash-logo" svg={logoIcon} />

                <SVGInline
                  className="game__iframe-splash-figure-1"
                  svg={appHelper.isDesktopSize(size) ? splashDesktop1 : splashMobile1}
                />

                <SVGInline
                  className="game__iframe-splash-figure-2"
                  svg={appHelper.isDesktopSize(size) ? splashDesktop2 : splashMobile2}
                />
              </div>
            </div>

            {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
            {appHelper.isPhoneSize(size) && <div className="game__iframe-overlay" onClick={onOverlayClick} />}

            {paymentState.shouldRender && (
              <GamePayment
                token={paymentState.token}
                onClose={(notify) => {
                  if (notify) {
                    document.dispatchEvent(new CustomEvent('gamePayment-close'));
                  }

                  setPaymentState({ shouldRender: false, token: '' });
                }}
              />
            )}
          </>
        ) : (
          <>
            {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/interactive-supports-focus */}
            <div className="game__iframe-placeholder" onClick={onOverlayClick} style={iframeBackground} role="button" />
          </>
        )}

        <GameCampaignBlock adfox={adfox} size={size} />

        {profileIframeVisibility && <ProfileIframe game={game} />}
      </section>

      {appHelper.isPhoneSize(size) && !isStretched && (
        <>
          <div className="game__iframe-buttons">
            <button type="button" className="game__iframe-overlay__btn" onClick={onOverlayClick}>
              {isStarted ? 'Продолжить' : 'Играть'}
            </button>

            <a
              href="/feedback"
              target="_blank"
              rel="noopener noreferer nofollow"
              className="game__iframe-overlay__btn game__iframe-overlay__btn--text"
            >
              <SVGInline svg={gameHelpIcon} />
              <span>Помощь</span>
            </a>
          </div>

          <SocialLinks />
        </>
      )}

      <div className="game__iframe-tools">
        {!pwaMode &&
          (appHelper.isPhoneSize(size) ? isStretched && bookmarkState.shouldRenderFloatable : true) &&
          banner}

        {!pwaMode && (
          <div className="game__iframe-tools-inner">
            <SocialLinks text="Стань частью сообщества" />

            <a href="/feedback" target="_blank" rel="noopener noreferer nofollow" className="game__iframe-feedback">
              <SVGInline svg={gameHelpIcon} />
              <span>Помощь</span>
            </a>

            <button className="game__iframe-fullscreen" onClick={goFullscreen} type="button">
              <SVGInline svg={fullscreenIcon} />
              <span>Во весь экран</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

GameIframe.defaultProps = gameIframeBlockDefaultProperties;
GameIframe.propTypes = gameIframeBlockPropertyTypes;

export default connect((state) => {
  return {
    profileIframeVisibility: state.app.profileIframeVisibility,
  };
})(pure(GameIframe));
