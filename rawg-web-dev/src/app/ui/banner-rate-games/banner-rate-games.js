import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'app/components/link';
import { FormattedMessage } from 'react-intl';
import { compose } from 'recompose';
import { hot } from 'react-hot-loader';

import CloseButton from 'app/ui/close-button';
import paths from 'config/paths';

import './banner-rate-games.styl';

const hoc = compose(hot(module));

const BannerRateGamesComponent = ({ hideBanner }) => (
  <div className="banner-rate-games">
    <div className="banner-rate-games__text">
      <FormattedMessage id="banners.rate-games-text" />
    </div>
    <div className="banner-rate-games__grow-container">
      <Link className="banner-rate-games__link" to={paths.rateUserGames}>
        <FormattedMessage id="banners.rate-games-btn" />
      </Link>
    </div>
    <CloseButton onClick={hideBanner} className="banner-rate-games__close-button" />
  </div>
);

BannerRateGamesComponent.propTypes = {
  hideBanner: PropTypes.func.isRequired,
};

const BannerRateGames = hoc(BannerRateGamesComponent);

export default BannerRateGames;
