import cn from 'classnames';
import React, { useEffect, useState } from 'react';

import propTypes from 'prop-types';
import SVGInline from 'react-svg-inline';

import appHelper from 'app/pages/app/app.helper';
import './bookmark-banner.styl';

import svgAndroid from 'assets/icons/game-bookmark/android.svg';
import svgClose from 'assets/icons/game-bookmark/close.svg';
import svgSafari from 'assets/icons/game-bookmark/safari.svg';
import svgStar from 'assets/icons/game-bookmark/star.svg';
import { parseCookies } from 'tools/fetch';
import { isFlutter } from 'tools/is-flutter';

export const BOOKMARK_BANNER_STORAGE_NAME = 'bookmark-banner';

const GameBookmarkBanner = ({ isFloating, game, size }) => {
  const [shouldRender, setRender] = useState(false);

  useEffect(() => {
    const cookies = parseCookies(document.cookie);
    const state = cookies[BOOKMARK_BANNER_STORAGE_NAME] || 'true';

    if (isFlutter(navigator.userAgent)) {
      setRender(false);
    } else if (isFloating) {
      setRender(state === 'true');
    } else {
      setRender(true);
    }

    return () => {
      setRender(false);
    };
  }, [size]);

  if (!shouldRender) {
    return null;
  }

  const isSafari = /.*Version.*Safari.*/.test(navigator.userAgent);

  return (
    <div
      className={cn('game-bookmark-banner', {
        'game-bookmark-banner--is-floating': isFloating,
      })}
    >
      <strong className="game-bookmark-banner__title">Хочешь играть на весь экран?</strong>

      <p className="game-bookmark-banner__body">
        {/* eslint-disable-next-line no-nested-ternary */}
        {appHelper.isDesktopSize(size) ? (
          <>
            <SVGInline className="star" svg={svgStar} />
            <span>
              Сохрани эту страницу в закладки, чтобы запускать игру в один клик.
              {/* <a href={`/games/${game.slug}`} target="_blank" rel="nofollow noopener noreferrer">
                игрой
              </a>{' '} */}
            </span>
          </>
        ) : isSafari ? (
          <>
            Нажми иконку в меню телефона <SVGInline className="safari" svg={svgSafari} /> внизу и выбери «Добавить на
            экран домой».
          </>
        ) : (
          <>
            Нажми иконку в меню телефона <SVGInline className="android" svg={svgAndroid} /> и выбери «Добавить на
            главный экран».
          </>
        )}
      </p>

      {isFloating && (
        <div
          className="game-bookmark-banner__close"
          onClick={() => {
            if (typeof document !== 'undefined') {
              document.cookie = `${BOOKMARK_BANNER_STORAGE_NAME}=false; Path=/; Secure; SameSite=Lax; Max-Age=${86400 *
                14}`;
            }

            setRender(false);
          }}
          role="button"
          tabIndex={0}
        >
          <SVGInline svg={svgClose} />
        </div>
      )}
    </div>
  );
};

GameBookmarkBanner.propTypes = {
  isFloating: propTypes.bool,
  game: propTypes.object,
  size: propTypes.string,
};

export default GameBookmarkBanner;
