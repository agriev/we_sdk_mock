/* eslint-disable react/no-danger */

import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { pure } from 'recompose';
import { Element } from 'react-scroll';

// import truncate from 'lodash/truncate';

import env from 'config/env';

import trans from 'tools/trans';

import paths from 'config/paths';

import Heading from 'app/ui/heading';
import SimpleIntleMessage from 'app/components/simple-intl-message';

import TruncateBlockByLines from 'app/ui/truncate-block-by-lines';
import { description as descriptionType } from 'app/pages/game/game.types';
import { appLocaleType } from 'app/pages/app/app.types';

const gameAboutBlockPropertyTypes = {
  isSpider: PropTypes.bool.isRequired,
  locale: appLocaleType.isRequired,
  description: descriptionType,
  editorialReview: PropTypes.bool,
  review: PropTypes.string,
  gameSlug: PropTypes.string,
};

const gameAboutBlockDefaultProperties = {
  description: '',
  review: undefined,
  editorialReview: false,
  gameSlug: undefined,
};

const GameAboutBlock = ({ gameSlug, description, editorialReview, review, locale }) => {
  /* eslint-disable react/no-danger-with-children, react/no-children-prop */

  if (!description) {
    return null;
  }

  const useEditorialReview = locale === 'ru' && editorialReview;
  const text = (useEditorialReview ? review : description) || '';

  const [useTruncate, setUseTruncate] = useState(false);

  useEffect(() => {
    setUseTruncate(true);
  }, []);

  const showFullText = !env.isClient();

  return (
    <div className="game__about">
      <Element name="about" />
      <Heading className="game__block-title game__about-title" rank={2}>
        <SimpleIntleMessage id={useEditorialReview ? 'game.review' : 'game.title_about'} />
      </Heading>
      <div
        itemProp="description"
        className="game__about-text"
        dangerouslySetInnerHTML={showFullText ? { __html: text } : undefined}
        children={
          useTruncate ? (
            <TruncateBlockByLines
              showMoreUrl={useEditorialReview ? paths.gameReview(gameSlug) : undefined}
              showMoreText={trans('game.read_more')}
              text={text}
              lines={8}
            />
          ) : (
            undefined
          )
        }
      />
    </div>
  );
};

GameAboutBlock.propTypes = gameAboutBlockPropertyTypes;
GameAboutBlock.defaultProps = gameAboutBlockDefaultProperties;

export default pure(GameAboutBlock);
