/* eslint-disable react/no-danger */

import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'app/components/link';

import './files.styl';

import { appLocaleType } from 'app/pages/app/app.types';

import Heading from 'app/ui/heading';
import SimpleIntleMessage from 'app/components/simple-intl-message';
import paths from 'config/paths';

const propTypes = {
  locale: appLocaleType.isRequired,
  gameSlug: PropTypes.string,
  cheatsCount: PropTypes.number.isRequired,
  demosCount: PropTypes.number.isRequired,
  patchesCount: PropTypes.number.isRequired,
};

const defaultProps = {
  gameSlug: undefined,
};

const GameFilesBlock = ({ locale, gameSlug, cheatsCount, demosCount, patchesCount }) => {
  if (locale !== 'ru' || !gameSlug || (!cheatsCount && !demosCount && !patchesCount)) {
    return null;
  }

  return (
    <div className="game__files">
      <Heading className="game__block-title" rank={2}>
        <SimpleIntleMessage id="game.title_files" />
      </Heading>
      {cheatsCount > 0 && (
        <div className="game__files__file">
          <Link to={paths.gameCheats(gameSlug)}>
            <SimpleIntleMessage id="game.files_section_cheats" />
          </Link>
          <span className="game__files__file__counter">{cheatsCount}</span>
        </div>
      )}
      {demosCount > 0 && (
        <div className="game__files__file">
          <Link to={paths.gameDemos(gameSlug)}>
            <SimpleIntleMessage id="game.files_section_demos" />
          </Link>
          <span className="game__files__file__counter">{demosCount}</span>
        </div>
      )}
      {patchesCount > 0 && (
        <div className="game__files__file">
          <Link to={paths.gamePatches(gameSlug)}>
            <SimpleIntleMessage id="game.files_section_patches" />
          </Link>
          <span className="game__files__file__counter">{patchesCount}</span>
        </div>
      )}
    </div>
  );
};

GameFilesBlock.propTypes = propTypes;
GameFilesBlock.defaultProps = defaultProps;

export default GameFilesBlock;
