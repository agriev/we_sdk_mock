import React from 'react';
import sanitizeHtml from 'sanitize-html';

import get from 'lodash/get';
import has from 'lodash/has';
import isArray from 'lodash/isArray';

import steamIcon from 'assets/icons/stores/steam.svg';
import psStoreIcon from 'assets/icons/stores/ps-store.svg';
import xboxIcon from 'assets/icons/stores/xbox.svg';
import appstoreIcon from 'assets/icons/stores/appstore.svg';
import gogIcon from 'assets/icons/stores/gog.svg';
import googlePlayIcon from 'assets/icons/stores/google-play.svg';
import nintendoIcon from 'assets/icons/stores/nintendo.svg';
import itchIcon from 'assets/icons/stores/itch.svg';
import epicIcon from 'assets/icons/stores/epicgames.svg';
import discordIcon from 'assets/icons/stores/discord-store.svg';

import platformIcons from 'assets/icons/platforms-icons';

const PARENT_PLATFORMS = [
  {
    name: 'pc',
    children: ['pc'],
  },
  {
    name: 'playstation',
    children: ['playstation', 'ps', 'psp', 'playstation1'],
  },
  {
    name: 'xbox',
    children: ['xbox', 'xbox-one'],
  },
  {
    name: 'ios',
    children: ['ios', 'mobile'],
  },
  {
    name: 'android',
    children: ['android'],
  },
  {
    name: 'nintendo',
    children: ['nintendo', 'wii', 'neo'],
  },
  {
    name: 'mac',
    children: ['mac', 'maos'],
  },
  {
    name: 'linux',
    children: ['linux'],
  },
  {
    name: 'commodore-amiga',
    children: ['commodore / amiga'],
  },
  {
    name: '3do',
    children: ['3do'],
  },
  {
    name: 'atari',
    children: [
      'atari',
      'atari 8-bit',
      'atari 7800',
      'atari xegs',
      'atari 2600',
      'atari 5200',
      'atari lynx',
      'atari st',
      'atari flashback',
      'atari jaguar',
    ],
  },
  {
    name: 'sega',
    children: ['sega', 'sega master system', 'sega cd', 'sega 32x', 'game gear', 'sega saturn', 'dreamcast'],
  },
  {
    name: 'web',
    children: ['web'],
  },
];

export function getStoreIcon(storeSlug) {
  switch (storeSlug) {
    case 'steam':
      return steamIcon;
    case 'xbox': // delete after backend rename it
    case 'xbox360':
    case 'xbox-store':
      return xboxIcon;
    case 'playstation': // delete after backend rename it
    case 'playstation-store':
      return psStoreIcon;
    case 'ios': // delete after backend rename it
    case 'apple-appstore':
      return appstoreIcon;
    case 'gog':
      return gogIcon;
    case 'nintendo':
      return nintendoIcon;
    case 'android': // delete after backend rename it
    case 'google-play':
      return googlePlayIcon;
    case 'itch':
      return itchIcon;
    case 'epic-games':
      return epicIcon;
    case 'discord':
      return discordIcon;
    default:
      return null;
  }
}

export const findParentPlatform = (name) => {
  const platformName = name.toLowerCase();

  return PARENT_PLATFORMS.find((parent) => parent.children.some((child) => platformName.includes(child)));
};

export function getPlatformIcon(name) {
  const platform = findParentPlatform(name);
  if (platform) {
    const key = platform.name;

    return platformIcons[key];
  }

  return null;
}

export function needLoadingGame(stateGameId, gameId) {
  return !stateGameId || stateGameId !== gameId;
}

export function needLoadSubpageData(data) {
  return !data || (has(data, 'results') && data.results.length === 0 && !data.loading);
}

export const isUgly = (game) => {
  const { released, platforms = [] } = game;

  if (released) {
    const releasedDate = new Date(released);

    if (releasedDate.getFullYear() < 2012) {
      return true;
    }
  }

  if (isArray(platforms) && platforms.length > 0) {
    const platformSlugs = platforms.map((platform) => get(platform, 'platform.slug'));

    if (
      (platformSlugs.length === 1 && (platformSlugs[0] === 'ios' || platformSlugs[0] === 'android')) ||
      (platformSlugs.length === 2 && platformSlugs.includes('ios') && platformSlugs.includes('android'))
    ) {
      return true;
    }
  }

  return false;
};

export const displayAboutText = (description) => {
  /* eslint-disable react/no-danger */

  const html = sanitizeHtml(description, {
    allowedTags: [
      'h3',
      'h4',
      'h5',
      'h6',
      'blockquote',
      'p',
      'a',
      'ul',
      'ol',
      'nl',
      'li',
      'b',
      'i',
      'strong',
      'em',
      'strike',
      'hr',
      'br',
      'div',
      'table',
      'thead',
      'caption',
      'tbody',
      'tr',
      'th',
      'td',
      'iframe',
    ],
  });

  return (
    <div
      dangerouslySetInnerHTML={{
        __html: html,
      }}
    />
  );
};

// eslint-disable-next-line react/prop-types
export const AggregateRating = ({ game }) => {
  /* eslint-disable react/prop-types */

  if (game.rating_top < 1) {
    return null;
  }

  return (
    <div itemProp="aggregateRating" itemScope itemType="http://schema.org/AggregateRating">
      <meta itemProp="author" content="RAWG" />
      <meta itemProp="worstRating" content="2" />
      <meta itemProp="bestRating" content="5" />
      <meta itemProp="ratingValue" content={game.rating_top <= 1 ? 2 : game.rating_top} />
      {game.ratings_count > 0 && <meta itemProp="ratingCount" content={game.ratings_count} />}
      {game.reviews_text_count > 0 && <meta itemProp="reviewCount" content={game.reviews_text_count} />}
    </div>
  );
};
