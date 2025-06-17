/* eslint-disable react/no-danger */
import React from 'react';
import { pure } from 'recompose';
import SVGInline from 'react-svg-inline';

import twitterIcon from '../assets/twitter.svg';
import discordIcon from '../assets/discord.svg';

const SocialLinks = () => (
  <div className="apidocs-socials">
    <a
      href="https://twitter.com/rawgtheworld"
      target="_blank"
      rel="noopener noreferrer"
      className="apidocs-socials__link"
      title="twitter"
    >
      <SVGInline className="apidocs-socials__icon" svg={twitterIcon} />
    </a>
    <a
      href="https://discord.gg/erNybDp"
      target="_blank"
      rel="noopener noreferrer"
      className="apidocs-socials__link"
      title="discord"
    >
      <SVGInline className="apidocs-socials__icon" svg={discordIcon} />
    </a>
  </div>
);

export default pure(SocialLinks);
