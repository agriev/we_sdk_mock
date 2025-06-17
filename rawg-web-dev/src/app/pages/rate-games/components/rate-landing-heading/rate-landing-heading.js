import React from 'react';

import paths from 'config/paths';

import Heading from 'app/ui/heading/heading';

import styleVars from 'styles/vars.json';

import gamesImageEn from 'app/pages/rate-games/assets/en/games.png';
import gamesImageEn2x from 'app/pages/rate-games/assets/en/games@2x.png';
import gamesImageMobEn from 'app/pages/rate-games/assets/en/games-mob.png';
import gamesImageMobEn2x from 'app/pages/rate-games/assets/en/games-mob@2x.png';
import subheadingEn from 'app/pages/rate-games/assets/en/rate-the-all-time-be.svg';

import gamesImageRu from 'app/pages/rate-games/assets/ru/games.png';
import gamesImageMobRu from 'app/pages/rate-games/assets/ru/games-mobile.png';
import subheadingRu from 'app/pages/rate-games/assets/ru/rate-the-all-time-be.svg';

import { appLocaleType } from 'app/pages/app/app.types';

import './rate-landing-heading.styl';

const propTypes = {
  locale: appLocaleType.isRequired,
};

const RateLandingHeading = ({ locale }) => {
  const isEn = locale === 'en';

  return (
    <Heading className="rate-landing-heading" rank={1} withMobileOffset>
      <img
        className="rate-landing-heading__subheading"
        src={paths.svgImagePath(isEn ? subheadingEn : subheadingRu)}
        width="574"
        height="54"
        alt="Rate new & trending"
      />
      <picture className="rate-landing-heading__heading">
        {isEn && (
          <>
            <source media={styleVars.bp.desktop} srcSet={`${gamesImageEn2x} 2x, ${gamesImageEn} 1x`} />
            <source media={styleVars.bp.phone} srcSet={`${gamesImageMobEn2x} 2x, ${gamesImageMobEn} 1x`} />
            <img src={gamesImageEn} alt="games" />
          </>
        )}
        {!isEn && (
          <>
            <source media={styleVars.bp.desktop} srcSet={`${gamesImageRu} 1x`} />
            <source media={styleVars.bp.phone} srcSet={`${gamesImageMobRu} 1x`} />
            <img src={gamesImageRu} alt="games" />
          </>
        )}
      </picture>
    </Heading>
  );
};

RateLandingHeading.propTypes = propTypes;

export default RateLandingHeading;
