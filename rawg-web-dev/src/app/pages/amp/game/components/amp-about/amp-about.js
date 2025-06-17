/* eslint-disable react/no-danger */

import React from 'react';
import { pure } from 'recompose';
import truncate from 'lodash/truncate';
import { FormattedMessage } from 'react-intl';
import sanitizeHtml from 'sanitize-html';

import { description as descriptionType } from 'app/pages/game/game.types';

const gameAboutBlockPropertyTypes = {
  description: descriptionType,
};

const gameAboutBlockDefaultProperties = {
  description: '',
};

const AmpAbout = (props) => {
  const { description } = props;

  if (!description) {
    return null;
  }

  return (
    <div className="game__about">
      <div className="game__block-title game__about-title">
        <FormattedMessage id="game.title_about" />
      </div>
      <meta itemProp="description" content={truncate(description, { length: 500 })} />
      <div
        className="game__about-text"
        dangerouslySetInnerHTML={{
          __html: sanitizeHtml(description),
        }}
      />
    </div>
  );
};

AmpAbout.propTypes = gameAboutBlockPropertyTypes;
AmpAbout.defaultProps = gameAboutBlockDefaultProperties;

export default pure(AmpAbout);
