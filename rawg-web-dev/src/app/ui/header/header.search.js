import React, { useRef, useEffect } from 'react';
import cn from 'classnames';

import plural from 'plural-ru';
import PropTypes from 'prop-types';
import { Link } from 'app/components/link';

import Loading2 from 'app/ui/loading-2';
import { createAvatar } from './header.utils';

export const HeaderSearch = ({
  className,
  inputRef = {},
  isRunning = false,
  onClick,
  onClickOutside,
  renderResultsTotal = false,
  results = {},
  resultsTotal = 0,
  query = '',
}) => {
  const rootRef = useRef();
  const sectionsOrder = ['games', 'collections', 'personalGames', 'creators', 'users'];

  function renderSection(key, payload) {
    if (!payload || !payload.count) {
      return null;
    }

    const title = {
      collections: 'Коллекции',
      creators: 'Создатели',
      games: 'Игры',
      personalGames: 'Моя библиотека',
      users: 'Пользователи',
    };

    const render = {
      collections() {
        return payload.data.map((entry, entryKey) => {
          return (
            <Link
              to={`/collections/${entry.slug}`}
              key={entryKey}
              className="header-search__section-entry header-search__section-entry--collection"
            >
              <div className="header-search__section-collection">
                {Array.from({ length: 4 }).map((_, index) => {
                  const background = entry.backgrounds[index];
                  return <img key={index} src={background ? background.url : ''} alt=" " />;
                })}
              </div>

              <div className="header-search__section-info">
                <span>{entry.name}</span>

                <small>
                  {entry.games_count} {plural(entry.games_count, 'игра', 'игры', 'игр')}
                </small>
              </div>
            </Link>
          );
        });
      },

      creators() {
        return payload.data.map((entry, entryKey) => {
          return (
            <Link
              to={`/creators/${entry.slug}`}
              key={entryKey}
              className="header-search__section-entry header-search__section-entry--creator"
            >
              <img src={entry.image || entry.image_background} alt=" " />

              <div className="header-search__section-info">
                <span>{entry.name}</span>
                <small>{entry.positions.map((p) => p.name[0].toUpperCase() + p.name.slice(1)).join(', ')}</small>
              </div>
            </Link>
          );
        });
      },

      games() {
        return payload.data.map((entry, entryKey) => {
          return (
            <Link
              to={`/games/${entry.slug}`}
              key={entryKey}
              className="header-search__section-entry header-search__section-entry--game"
            >
              <img src={entry.background_image} alt=" " />

              <div className="header-search__section-info">
                <span>{entry.name}</span>
              </div>
            </Link>
          );
        });
      },

      personalGames() {
        // eslint-disable-next-line react/no-this-in-sfc
        return this.games();
      },

      users() {
        return payload.data.map((entry, entryKey) => {
          const generatedAvatar = createAvatar(entry.username[0]);

          return (
            <Link
              to={`/@${entry.slug}`}
              key={entryKey}
              className="header-search__section-entry header-search__section-entry--creator"
            >
              {entry.avatar ? (
                <img
                  src={entry.avatar}
                  alt=" "
                  onError={(event) => {
                    event.currentTarget.src = generatedAvatar;
                  }}
                />
              ) : (
                <img src={generatedAvatar} alt=" " />
              )}

              <div className="header-search__section-info">
                <span>{entry.username}</span>

                <small>
                  {entry.games_count} {plural(entry.games_count, 'игра', 'игры', 'игр')}, {entry.collections_count}{' '}
                  {plural(entry.collections_count, 'коллекция', 'коллекции', 'коллекций')}
                </small>
              </div>
            </Link>
          );
        });
      },
    };

    return (
      <div className="header-search__section" key={key}>
        <div className="header-search__section-title">
          <strong>{title[key] || key}</strong>
          <span>{payload.count}</span>
        </div>

        {render[key] && render[key]()}
      </div>
    );
  }

  function onWindowClick(event) {
    if (!rootRef.current) {
      return;
    }

    if (rootRef.current.contains(event.target)) {
      return;
    }

    if (event.target === inputRef.current) {
      return;
    }

    if (onClickOutside) {
      onClickOutside();
    }
  }

  useEffect(() => {
    window.addEventListener('click', onWindowClick);

    return () => {
      window.removeEventListener('click', onWindowClick);
    };
  }, []);

  useEffect(() => {
    if (rootRef.current) {
      rootRef.current.addEventListener('click', onClick);
    }

    return () => {
      if (rootRef.current) {
        rootRef.current.removeEventListener('click', onClick);
      }
    };
  }, [rootRef]);

  return (
    <div className={cn('header-search', 'hide-scroll', className)} ref={rootRef}>
      {/* eslint-disable-next-line no-nested-ternary */}
      {isRunning ? (
        <Loading2 radius={24} stroke={2} className="header-search__loading" />
      ) : resultsTotal > 0 ? (
        <>
          {sectionsOrder.map((key) => renderSection(key, results[key]))}
          {renderResultsTotal && (
            <div className="header-search__section header-search__section--total">
              <Link to={`/search?query=${encodeURIComponent(query)}`} className="header-search__section-entry">
                <span>Показать всё</span> {resultsTotal}
              </Link>
            </div>
          )}
        </>
      ) : (
        <div className="header-search__not-found">
          {query.length > 0 ? 'Ничего не найдено' : 'Введите поисковый запрос'}
        </div>
      )}
    </div>
  );
};

HeaderSearch.propTypes = {
  className: PropTypes.string,
  inputRef: PropTypes.object,
  isRunning: PropTypes.bool,
  onClick: PropTypes.func,
  onClickOutside: PropTypes.func,
  renderResultsTotal: PropTypes.bool,
  results: PropTypes.object,
  resultsTotal: PropTypes.number,
  query: PropTypes.string,
};
