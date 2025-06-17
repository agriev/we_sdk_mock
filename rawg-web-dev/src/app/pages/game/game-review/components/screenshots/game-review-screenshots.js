import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { compose } from 'recompose';
import { hot } from 'react-hot-loader/root';
import { Link } from 'app/components/link';
import gameType from 'app/pages/game/game.types';
import Heading from 'app/ui/heading/heading';
import SimpleIntlMessage from 'app/components/simple-intl-message/simple-intl-message';
import paths from 'config/paths';

import './game-review-screenshots.styl';

import take from 'lodash/take';
import slice from 'lodash/slice';

import len from 'tools/array/len';
import resize from 'tools/img/resize';

import GameViewer from 'app/pages/game/game-viewer';

const hoc = compose(hot);

const propTypes = {
  game: gameType.isRequired,
  isDesktop: PropTypes.bool.isRequired,
};

const defaultProps = {
  //
};

const ReviewScreenshotsComponent = ({ game, isDesktop }) => {
  const screenshots = game.screenshots.results;
  const screenshotsCount = game.screenshots.count;
  const [viewerActive, setViewerActive] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const onScreenshotClick = useCallback((event) => {
    setViewerIndex(parseInt(event.target.getAttribute('data-index'), 10));
    setViewerActive(true);
  }, []);
  const closeViewer = useCallback(() => {
    setViewerActive(false);
  }, []);

  if (len(screenshots) < 1) {
    return null;
  }

  const first2Screens = take(screenshots, 2);
  const last3Screens = slice(screenshots, 2, 5);
  const first5Screens = take(screenshots, 5);

  return (
    <>
      <div className="game_review__screenshots__heading">
        <Heading rank={2}>
          <Link to={paths.gameScreenshots(game.slug)}>
            <SimpleIntlMessage id="game.screenshots" />
          </Link>
          <span className="game_review__screenshots__heading__count">{screenshotsCount}</span>
        </Heading>
      </div>
      <div className="game_review__screenshots-wrap">
        <div className="game_review__screenshots">
          {isDesktop && (
            <>
              <div className="game_review__screenshots__left">
                {first2Screens.map((img, idx) => (
                  <div
                    key={img.image}
                    className="game_review__screenshots__left__img"
                    style={{ backgroundImage: `url(${resize(600, img.image)})` }}
                    data-index={idx}
                    onClick={onScreenshotClick}
                    role="button"
                    tabIndex={0}
                  />
                ))}
              </div>
              <div className="game_review__screenshots__right">
                {last3Screens.map((img, idx) => (
                  <div
                    key={img.image}
                    className="game_review__screenshots__right__img"
                    style={{ backgroundImage: `url(${resize(420, img.image)})` }}
                    data-index={idx + 2}
                    onClick={onScreenshotClick}
                    role="button"
                    tabIndex={0}
                  />
                ))}
              </div>
            </>
          )}
          {!isDesktop &&
            first5Screens.map((img, idx) => (
              <div
                key={img.image}
                className="game_review__screenshots__img"
                style={{ backgroundImage: `url(${resize(420, img.image)})` }}
                data-index={idx}
                onClick={onScreenshotClick}
                role="button"
                tabIndex={0}
              />
            ))}
        </div>
      </div>
      {viewerActive && <GameViewer content="screenshots" activeIndex={viewerIndex} onClose={closeViewer} />}
    </>
  );
};

ReviewScreenshotsComponent.propTypes = propTypes;
ReviewScreenshotsComponent.defaultProps = defaultProps;

const ReviewScreenshots = hoc(ReviewScreenshotsComponent);

export default ReviewScreenshots;
