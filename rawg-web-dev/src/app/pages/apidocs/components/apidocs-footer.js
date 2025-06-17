/* eslint-disable react/no-danger */
import React from 'react';
import { pure } from 'recompose';

import SocialLinks from './social-links';

// prettier-ignore
const ApidocsFooter = () => {
  return (
    <footer className="apidocs-footer">
      <a href="/" className="logo">
        RAWG
      </a>
      <div className="apidocs-footer__text">
        {new Date().getFullYear()} © RAWG, Behind The Games
      </div>
      <SocialLinks />
    </footer>
  );
};

export default pure(ApidocsFooter);
