/* eslint-disable no-nested-ternary, react/prop-types, camelcase */

import React from 'react';
import { Link } from 'app/components/link';
import cn from 'classnames';

import Platforms from 'app/ui/platforms';
import paths from 'config/paths';

const AmpYoutubeCard = ({ ...props }) => {
  const { className, game, isAddedCounter } = props;

  const { slug, name, background_image, platforms, parent_platforms, users, added } = game;

  return (
    <div className={cn('agci', className)}>
      <Link to={paths.game(slug)} href={paths.game(slug)}>
        <div className="agci__img-wrap">
          {background_image && background_image.length > 0 && <amp-img src={background_image} layout="fill" />}
        </div>
        <div className="agci__meta-wrap">
          <div className="agci__meta-title" title={name}>
            {name}
          </div>
          <Platforms
            className="game-card__platforms-light"
            platforms={platforms}
            parentPlatforms={parent_platforms}
            size="medium"
          />
        </div>
        <div className="agci__buttons-wrap">
          <div className="agci__button-count">{added || ''}</div>
          {isAddedCounter && users && users.count > 0 && <div className="agci__started-playing">+{users.count}</div>}
        </div>
      </Link>
    </div>
  );
};

export default AmpYoutubeCard;
