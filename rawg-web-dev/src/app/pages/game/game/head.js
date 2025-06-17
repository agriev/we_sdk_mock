/* eslint-disable camelcase */

import React, { useMemo } from 'react';
import { pure } from 'recompose';

import Heading from 'app/ui/heading';

import { appSizeType } from 'app/pages/app/app.types';
import {
  name as nameType,
  released as releasedType,
  platforms as platformsType,
  parent_platforms as parent_platforms_type,
  playtime as playtimeType,
  promo as promoType,
} from 'app/pages/game/game.types';
import config from 'config/config';

import GameHeadMeta from 'app/ui/game-head-meta';
import SVGInline from 'react-svg-inline';

import PropTypes from 'prop-types';
import iconPlays from './assets/plays.svg';

const gameHeadBlockPropertyTypes = {
  size: appSizeType.isRequired,
  name: nameType,
  released: releasedType,
  platforms: platformsType,
  parent_platforms: parent_platforms_type,
  playtime: playtimeType,
  promo: promoType,
  plays: PropTypes.number,
  short_description: PropTypes.string,
};

const gameHeadBlockDefaultProperties = {
  short_description: '',
  platforms: [],
  parent_platforms: [],
  released: '',
  playtime: 0,
  plays: 0,
  name: '',
  promo: '',
};

const GameHeadBlock = ({
  short_description,
  size,
  name,
  released,
  platforms,
  parent_platforms,
  playtime,
  plays,
  promo,
}) => {
  const e3 = config.promos.e3 && promo === 'e3';
  const gc = config.promos.gamescom && promo === 'gamescom';

  const playCount = useMemo(() => {
    let num = plays;

    if (typeof num !== 'number' || num < 10) {
      return '';
    }

    num = String(num);
    num = num.substring(0, num.length - 1) + 0;
    num = Intl.NumberFormat('ru').format(num);

    return `${num}+ игроков`;
  }, [plays]);

  return (
    <div className="game__head">
      <GameHeadMeta
        appSize={size}
        released={released}
        platforms={platforms}
        parentPlatforms={parent_platforms}
        playtime={playtime}
      />
      {e3 && <div className="game__head-e3-2018-promo" />}
      {gc && <div className="game__head-gamescom-promo" />}

      {playCount && (
        <div className="game__plays">
          <SVGInline svg={iconPlays} />
          <span>{playCount}</span>
        </div>
      )}

      <div className="game__heading-section">
        <Heading itemProp="name" className="game__title" rank={1}>
          {name}
        </Heading>

        {!!short_description && <div className="game__short-description">{short_description}</div>}
      </div>
    </div>
  );
};

GameHeadBlock.propTypes = gameHeadBlockPropertyTypes;
GameHeadBlock.defaultProps = gameHeadBlockDefaultProperties;

export default pure(GameHeadBlock);
