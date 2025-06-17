import React, { useRef, useMemo, useEffect, useState } from 'react';

import PropTypes from 'prop-types';

import { connect } from 'react-redux';
import SVGInline from 'react-svg-inline';
import { compose } from 'recompose';

import { Swiper, SwiperSlide } from 'swiper/react';

import currentUserType from 'app/components/current-user/current-user.types';
// import { appSizeType } from 'app/pages/app/app.types';
import denormalizeGame from 'tools/redux/denormalize-game';
import gameType from '../../pages/game/game.types';

import Logo from '../logo/logo';

import svgSliderChevron from './assets/slider-chevron.svg';

import './sidebar.styl';
import { HeaderMenuBody } from '../header/header.menu';
import { showIframeModal } from '../header/header.utils';

export const LAST_PLAYED_SLIDER_TIME = 60e3;

const SidebarRecentSlider = ({ lastPlayed = [] }) => {
  const swiperRef = useRef();

  const [timer, setTimer] = useState(0);

  function resetTimer() {
    clearInterval(timer);

    setTimer(
      setInterval(() => {
        if (swiperRef.current) {
          swiperRef.current.slideNext();
        }
      }, LAST_PLAYED_SLIDER_TIME),
    );
  }

  function swipeNext() {
    if (!swiperRef.current) {
      return;
    }

    swiperRef.current.slideNext();
    resetTimer();
  }

  function swipePrev() {
    if (!swiperRef.current) {
      return;
    }

    swiperRef.current.slidePrev();
    resetTimer();
  }

  useEffect(() => {
    resetTimer();

    return () => {
      clearInterval(timer);
    };
  }, []);

  return (
    <Swiper
      className="sidebar__recent-slider"
      slidesPerView={1}
      loop
      onInit={(swiper) => {
        swiperRef.current = swiper;
      }}
    >
      {lastPlayed.map((item, itemKey) => {
        return (
          <SwiperSlide key={itemKey}>
            <a
              href={`/games/${item.slug}?utm_source=sidebar-recent&utm_medium=sidebar&utm_campaign=crosspromo`}
              className="sidebar__recent-slide"
              onClick={(event) => {
                event.preventDefault();

                if (typeof window.yaCounter === 'object') {
                  window.yaCounter.reachGoal('SidebarRecentGames');
                }

                if (window.gtag) {
                  window.gtag('event', 'recommendation_click', {
                    game_title: item.name,
                    source: 'sidebar_recent',
                  });
                }

                const next = event.currentTarget.href;

                setTimeout(() => {
                  window.location.href = next;
                });
              }}
            >
              <img src={item.image} alt=" " />

              <p>
                <span>{item.name}</span>
              </p>
            </a>
          </SwiperSlide>
        );
      })}

      {lastPlayed.length > 1 && (
        <>
          <div className="sidebar__recent-slider-prev" onClick={swipePrev} role="button" tabIndex={0}>
            <SVGInline svg={svgSliderChevron} />
          </div>

          <div className="sidebar__recent-slider-next" onClick={swipeNext} role="button" tabIndex={0}>
            <SVGInline svg={svgSliderChevron} />
          </div>
        </>
      )}
    </Swiper>
  );
};

SidebarRecentSlider.propTypes = {
  lastPlayed: PropTypes.array,
};

const Sidebar = ({ lastPlayed = [], currentUser, game, recommended = [], pathname }) => {
  const rootRef = useRef(null);
  const [isMounted, setMounted] = useState(false);

  const currentLastPlayed = useMemo(() => {
    return lastPlayed.filter((entry) => entry.slug !== pathname.replace('/games/', ''));
  }, [lastPlayed, pathname]);

  useEffect(() => {
    setMounted(true);
  }, []);

  function onLogoClick() {
    if (rootRef.current) {
      rootRef.current.scrollTo({ behavior: 'smooth', top: 0 });
    }
  }

  return (
    <aside className="sidebar" style={isMounted ? null : { visibility: 'hidden' }}>
      <div className="sidebar__root hide-scroll" ref={rootRef}>
        <header className="sidebar__header">
          <a href="/" onClick={onLogoClick}>
            <Logo />
          </a>
        </header>

        {!currentUser.id && (
          <div className="sidebar__section sidebar__section--login">
            <p
              className="sidebar__section-text"
              // eslint-disable-next-line react/no-danger
              dangerouslySetInnerHTML={{
                __html:
                  game.name && (game.can_play || game.iframe_url) && pathname === `/games/${game.slug}`
                    ? `Войди, чтобы не потерять свой прогресс в <strong>${game.name}</strong>`
                    : 'Войди для быстрого доступа к своим играм.',
              }}
            />

            <button
              className="sidebar__section-login"
              type="button"
              onClick={() => showIframeModal({ from: 'sidebar' })}
            >
              Войти
            </button>
          </div>
        )}

        {currentLastPlayed.length > 0 && (
          <div className="sidebar__section sidebar__section--recent">
            <strong className="sidebar__section-title">Недавние</strong>
            <SidebarRecentSlider lastPlayed={currentLastPlayed} />
          </div>
        )}

        {recommended.length > 0 && (
          <div className="sidebar__section sidebar__section--hits">
            <strong className="sidebar__section-title">Хиты</strong>

            <div className="sidebar__section-hits">
              {recommended.slice(0, 10).map((item, itemKey) => {
                return (
                  <a
                    href={`/games/${item.slug}?utm_source=sidebar-recommended&utm_medium=sidebar&utm_campaign=crosspromo`}
                    className="sidebar__section-hit"
                    key={itemKey}
                    onClick={(event) => {
                      event.preventDefault();

                      if (typeof window.yaCounter === 'object') {
                        window.yaCounter.reachGoal('SidebarRecommendedGames');
                      }

                      if (window.gtag) {
                        window.gtag('event', 'recommendation_click', {
                          game_title: item.name,
                          source: 'sidebar_recommended',
                        });
                      }

                      const next = event.currentTarget.href;

                      setTimeout(() => {
                        window.location.href = next;
                      });
                    }}
                  >
                    <img src={item.image} alt=" " />
                    <span>{item.name}</span>
                  </a>
                );
              })}
            </div>
          </div>
        )}

        <HeaderMenuBody pathname={pathname} currentUser={currentUser} />
      </div>
    </aside>
  );
};

Sidebar.propTypes = {
  currentUser: currentUserType,
  game: gameType,
  // size: appSizeType.isRequired,
  lastPlayed: PropTypes.array,
  pathname: PropTypes.string,
  recommended: PropTypes.array,
};

const hoc = compose(
  connect((state) => ({
    currentUser: state.currentUser,
    game: denormalizeGame(state),
    lastPlayed: state.discover.lastPlayed,
    locale: state.app.locale,
    size: state.app.size,
    recommended: state.discover.recommended,
  })),
);

export default hoc(Sidebar);
