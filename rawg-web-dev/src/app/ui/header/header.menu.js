import React, { useMemo, useReducer } from 'react';
import cn from 'classnames';

import { CSSTransition } from 'react-transition-group';
import { Link } from 'app/components/link';
import { Swiper, SwiperSlide } from 'swiper/react';

import SVGInline from 'react-svg-inline';

import currentUserType from 'app/components/current-user/current-user.types';
import PropTypes from 'prop-types';

import { isFlutter } from 'tools/is-flutter';
import svgDots from './assets/dots.svg';
import svgSitemap from './assets/sitemap.svg';

import { HeaderSearch } from './header.search';
import { createAvatar, showIframeModal } from './header.utils';

const isFlutterMode = typeof navigator !== 'undefined' && isFlutter(navigator.userAgent);

export const HeaderMenuBody = ({ currentUser, pathname }) => {
  if (isFlutterMode) {
    return null;
  }

  const sections = useMemo(() => {
    const output = [
      {
        children: [
          { icon: '30-days', title: 'За 30 дней', to: '/discover/last-30-days' },
          { icon: 'this-week', title: 'Эта неделя', to: '/discover/this-week' },
          { icon: 'next-week', title: 'Следующая неделя', to: '/discover/next-week' },
          { icon: 'calendar', title: 'Календарь', to: '/video-game-releases' },
        ],

        title: 'Релизы',
      },
      {
        children: [
          { icon: 'this-year', title: 'За 2024 г.', to: '/discover/best-of-the-year' },
          { icon: 'previous-year', title: 'За 2023 г.', to: '/discover/popular-in-2023' },
          { icon: 'top-250', title: 'Топ 250', to: '/discover/all-time-top' },
        ],

        title: 'Лучшее',
      },
      {
        children: [
          { icon: 'platforms', title: 'Платформы', to: '/platforms' },
          { icon: 'stores', title: 'Магазины', to: '/stores' },
          { icon: 'collections', title: 'Коллекции', to: '/collections/popular' },
          { icon: 'reviews', title: 'Рецензии', to: '/reviews' },
          { icon: 'genres', title: 'Жанры', to: '/genres' },
          { icon: 'creators', title: 'Создатели', to: '/creators' },
          { icon: 'tags', title: 'Тэги', to: '/tags' },
          { icon: 'developers', title: 'Разработчики', to: '/developers' },
          { icon: 'publishers', title: 'Издатели', to: '/publishers' },
        ],

        title: 'Каталог',
        to: '/games/browse',
      },
      {
        allVisible: true,

        children: [
          { title: 'PC', to: '/games/pc' },
          { title: 'PlayStation 4', to: '/games/playstation4' },
          { title: 'Xbox One', to: '/games/xbox-one' },
          { title: 'Nintendo Switch', to: '/games/nintendo-switch' },
          { title: 'IOS', to: '/games/ios' },
          { title: 'Android', to: '/games/android' },
        ],

        title: 'Платформы',
        to: '/platforms',
      },
      {
        children: [
          { icon: 'actions', title: 'Экшены', to: '/games/action' },
          { icon: 'strategies', title: 'Стратегии', to: '/games/strategy' },
          { icon: 'rpg', title: 'Ролевые', to: '/games/role-playing-games-rpg' },
          { icon: 'shooters', title: 'Шутеры', to: '/games/shooter' },
          { icon: 'adventures', title: 'Приключения', to: '/games/adventure' },
          { icon: 'puzzles', title: 'Головоломки', to: '/games/puzzle' },
          { icon: 'races', title: 'Гонки', to: '/games/racing' },
          { icon: 'sports', title: 'Спорт', to: '/games/sports' },
        ],

        title: 'Жанры',
        to: '/genres',
      },
    ];

    if (currentUser && currentUser.id) {
      output.splice(0, 0, {
        children: [
          { icon: 'user', title: 'Моя страница', to: `/@${currentUser.username}` },
          { icon: 'library', title: 'Библиотека', to: '/discover/my-library' },
          { icon: 'wishlist', title: 'Вишлист', to: '/discover/wishlist' },
          { icon: 'friends-games', title: 'Игры друзей', to: '/discover/friends' },
        ],

        title: 'Моё',
      });
    }

    return output;
  }, [currentUser]);

  const MAX_CHILDREN_VISIBLE = 4;

  const [isOpened, setOpened] = useReducer((prev, next) => {
    return {
      ...prev,
      ...next,
    };
  }, {});

  function createSection(section, sectionKey) {
    const Title = section.to ? Link : 'strong';
    const children =
      isOpened[sectionKey] || section.allVisible ? section.children : section.children.slice(0, MAX_CHILDREN_VISIBLE);

    return (
      <div className="header-menu__section" key={sectionKey}>
        <Title
          className={cn('header-menu__title', {
            'header-menu__title--active': section.to === pathname,
          })}
          to={section.to}
        >
          {section.title}
        </Title>

        <div className="header-menu__section-children">
          {children.map((child, key) => {
            let icon = null;

            if (child.icon) {
              try {
                // eslint-disable-next-line global-require, import/no-dynamic-require
                icon = require(`./assets/menu/${child.icon}.svg`).default;
              } catch (error) {
                icon = null;
              }
            }

            return (
              <Link
                className={cn('header-menu__section-child', {
                  'header-menu__section-child--active': child.to === pathname,
                })}
                to={child.to}
                key={key + child.to}
              >
                {icon && <SVGInline svg={icon} />}
                {child.title}
              </Link>
            );
          })}

          {!section.allVisible && section.children.length > MAX_CHILDREN_VISIBLE && (
            <div
              onClick={() => setOpened({ [sectionKey]: !isOpened[sectionKey] })}
              className="header-menu__section-child"
              role="button"
              tabIndex={0}
            >
              <SVGInline svg={svgDots} />
              {isOpened[sectionKey] ? 'Спрятать' : 'Ещё'}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      {sections.map(createSection)}

      <div className="header-menu__section header-menu__section--sitemap">
        <Link to="/html-sitemap" className="header-menu__section-child">
          <SVGInline svg={svgSitemap} />
          Карта сайта
        </Link>
      </div>
    </>
  );
};

HeaderMenuBody.propTypes = {
  currentUser: currentUserType,
  pathname: PropTypes.string,
};

export const HeaderMenu = ({
  currentUser,
  lastPlayed = [],
  onProfileClick,
  pathname,
  recommended = [],
  searchQuery = '',
  searchRunning = false,
  searchResults = {},
  searchResultsTotal = 0,
}) => {
  const rubrics = [
    {
      title: 'Главная',
      to: '/',
    },
    {
      title: 'Рецензии',
      to: '/reviews',
    },
    {
      title: 'Все игры',
      to: '/games',
    },
  ];

  const currentLastPlayed = useMemo(() => {
    return lastPlayed.filter((entry) => entry.slug !== pathname.replace('/games/', ''));
  }, [lastPlayed, pathname]);

  return (
    <div className="header-menu">
      <div className="header-menu__root">
        <div className="header-menu__section header-menu__section--search " />

        <div className="header-menu__body">
          <CSSTransition in={searchQuery.length > 0} timeout={200} unmountOnExit classNames="fade">
            <div className="header-menu__body-inner header-menu__body-inner--search">
              <HeaderSearch isRunning={searchRunning} results={searchResults} resultsTotal={searchResultsTotal} />
            </div>
          </CSSTransition>

          <div className="header-menu__body-inner hide-scroll">
            {currentLastPlayed.length > 0 && (
              <div className="header-menu__section header-menu__section--recent">
                <strong className="header-menu__title">Недавние</strong>
                <Swiper className="header-menu__lastPlayed-slider" slidesPerView={1.25} spaceBetween={16}>
                  {currentLastPlayed.map((item, key) => (
                    <SwiperSlide key={key}>
                      <Link
                        to={`/games/${item.slug}?utm_source=sidebar-recent&utm_medium=sidebar&utm_campaign=crosspromo`}
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
                        className={cn('header-menu__lastPlayed-slide', {
                          'header-menu__lastPlayed-slide--active': `/games/${item.slug}` === pathname,
                        })}
                      >
                        <img src={item.image} alt=" " />
                        <span>{item.name}</span>
                      </Link>
                    </SwiperSlide>
                  ))}
                </Swiper>
              </div>
            )}

            {recommended.length > 0 && (
              <div className="header-menu__section header-menu__section--hits">
                <strong className="header-menu__title">Хиты</strong>

                <Swiper className="header-menu__hits-slider" slidesPerView={2.5} spaceBetween={16}>
                  {recommended.map((item, key) => (
                    <SwiperSlide key={key}>
                      <Link
                        to={`/games/${item.slug}?utm_source=sidebar-recommended&utm_medium=sidebar&utm_campaign=crosspromo`}
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
                        className={cn('header-menu__hits-slide', {
                          'header-menu__hits-slide--active': `/games/${item.slug}` === pathname,
                        })}
                      >
                        <img src={item.image} alt=" " />
                        <span>{item.name}</span>
                      </Link>
                    </SwiperSlide>
                  ))}
                </Swiper>
              </div>
            )}

            {!isFlutterMode && (
              <div className="header-menu__section header-menu__section--rubrics">
                {rubrics.map((rubric) => (
                  <Link
                    key={rubric.to}
                    className={cn('header-menu__rubric', {
                      'header-menu__rubric--active': rubric.to === pathname,
                    })}
                    to={rubric.to}
                  >
                    {rubric.title}
                  </Link>
                ))}
              </div>
            )}

            <HeaderMenuBody pathname={pathname} currentUser={currentUser} />
          </div>
        </div>

        <div className="header-menu__section header-menu__section--footer">
          {/* eslint-disable-next-line no-nested-ternary */}
          {searchQuery.length > 0 ? (
            searchResultsTotal > 0 &&
            !searchRunning && (
              <Link to={`/search?query=${encodeURIComponent(searchQuery)}`} className="header-menu__results">
                <span>Показать всё</span>
                {searchResultsTotal}
              </Link>
            )
          ) : currentUser.id ? (
            <div className="header-menu__user" onClick={onProfileClick} role="button" tabIndex={0}>
              <div className="header-menu__user-avatar">
                <img
                  src={currentUser.avatar}
                  onError={(event) => {
                    event.currentTarget.src = createAvatar(currentUser.username[0]);
                  }}
                  alt=" "
                />
              </div>

              <strong className="header-menu__user-name">{currentUser.username}</strong>
            </div>
          ) : (
            <button className="header-menu__auth" type="button" onClick={() => showIframeModal('header-menu')}>
              Войти
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

HeaderMenu.propTypes = {
  currentUser: currentUserType,
  lastPlayed: PropTypes.array,
  onProfileClick: PropTypes.func,
  pathname: PropTypes.string,
  searchQuery: PropTypes.string,
  searchRunning: PropTypes.bool,
  searchResults: PropTypes.object,
  searchResultsTotal: PropTypes.number,
  recommended: PropTypes.array,
};
