import React from 'react';

import paths from 'config/paths';
import Avatar from 'app/ui/avatar';
import { getPlatformIcon } from 'app/pages/game/game.helper';

const getPlatformImage = (name) => paths.svgImagePath(getPlatformIcon(name));

const renderPlatformImage = (item) =>
  getPlatformIcon(item.name) ? (
    <div className="card-template__small-image">
      <img className="card-template__image" src={getPlatformImage(item.name)} alt={item.name} />
    </div>
  ) : null;

const renderCreatorImage = (item) => (
  <Avatar size={128} className="card-template__avatar" src={item.image || item.avatar} />
);

export const maybeRenderItemImage = (item) =>
  item.image && <img className="card-template__image" src={item.image} alt={item.name} />;

export const renderImageFns = {
  creators: renderCreatorImage,
  person: renderCreatorImage,
  platforms: renderPlatformImage,
  platform: renderPlatformImage,
  user: renderCreatorImage,
  default: maybeRenderItemImage,
};
