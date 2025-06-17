import React from 'react';
import PropTypes from 'prop-types';
import ResponsiveImage from 'app/ui/responsive-image';

import coverImage from '../../assets/images/cover.png';
import coverImage2x from '../../assets/images/cover@2x.png';

// prettier-ignore
export const blockMain = ({ apiKeyUrl }) => (
  <div className="apidocs-explore">
    <div className="apidocs-explore__text">
      <h1 className="apidocs-explore__title">Explore RAWG Video Games Database API</h1>
      <p className="apidocs-explore__lead apidocs-lead">
        There are two types of companies: hoarders and givers. RAWG is the largest video
        game database and game discovery service. And we are gladly sharing our 500,000+
        games, search, and machine learning recommendations with the world. Learn what the
        RAWG games database API can do and build something cool with it!
      </p>
      <div className="apidocs-explore__buttons-wrapper">
        <a
          className="apidocs-button"
          href="https://api.rawg.io/docs/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Read documentation
        </a>
        <a
          className="apidocs-button _black"
          href={apiKeyUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Get API Key
        </a>
      </div>
    </div>
    <div className="apidocs-explore__cover">
      <ResponsiveImage
        className="apidocs-explore__cover-image"
        image={{
          simple: coverImage,
          retina: coverImage2x,
        }}
        title="games database"
        alt="games database"
      />
    </div>
  </div>
);

blockMain.propTypes = {
  apiKeyUrl: PropTypes.string.isRequired,
};
