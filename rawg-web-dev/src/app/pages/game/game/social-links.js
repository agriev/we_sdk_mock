import cn from 'classnames';
import propTypes from 'prop-types';

import React from 'react';
import SVGInline from 'react-svg-inline';

import iconDiscord from './assets/discord.svg';
import iconTelegram from './assets/telegram.svg';
import iconVK from './assets/vk.svg';

import './social-links.styl';

const SocialLinks = ({ customLinks = {}, isHeader, text, textLink }) => {
  const links = {
    vk: 'https://vk.com/absolute_games',
    discord: 'https://discord.gg/RmNhGDWDxp',
    telegram: 'https://t.me/agru_gameplatform',
    ...customLinks,
  };

  const icons = {
    discord: iconDiscord,
    telegram: iconTelegram,
    vk: iconVK,
  };

  function onIconClick() {
    if (typeof window.yaCounter === 'object') {
      window.yaCounter.reachGoal('informer-social');
    }
  }

  const Component = textLink ? 'a' : 'div';

  const attributes = textLink
    ? {
        href: textLink,
        target: '_blank',
        rel: 'noopener noreferer nofollow',
      }
    : {};

  return (
    <Component
      {...attributes}
      className={cn('game-social-links', {
        'game-social-links--header': isHeader,
        'game-social-links--with-text-link': !!textLink,
      })}
    >
      <span className="game-social-links__text">{text || 'Подпишись на игры'}</span>

      {!textLink && (
        <div className="game-social-links__icons">
          {Object.keys(links).map((key) => {
            return (
              <a href={links[key]} key={key} target="_blank" rel="noopener noreferrer nofollow" onClick={onIconClick}>
                <SVGInline svg={icons[key]} />
              </a>
            );
          })}
        </div>
      )}
    </Component>
  );
};

SocialLinks.propTypes = {
  customLinks: propTypes.object,
  isHeader: propTypes.bool,
  text: propTypes.string,
  textLink: propTypes.string,
};

export default SocialLinks;
