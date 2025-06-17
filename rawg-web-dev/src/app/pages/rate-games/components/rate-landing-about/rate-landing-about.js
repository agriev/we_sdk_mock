import React, { Fragment } from 'react';
import cn from 'classnames';

import paths from 'config/paths';
import trans from 'tools/trans';

import Heading from 'app/ui/heading/heading';

import styleVars from 'styles/vars.json';

import headingEn from 'app/pages/rate-games/assets/en/how-it-works.svg';
import headingMobEn from 'app/pages/rate-games/assets/en/how-it-works-mob.svg';
import headingRu from 'app/pages/rate-games/assets/ru/how-it-works.svg';

import exeptionalIcon from 'assets/icons/emoji/exceptional.png';
import mehIcon from 'assets/icons/emoji/meh.png';
import skipIcon from 'assets/icons/emoji/skip.png';
import recommendedIcon from 'assets/icons/emoji/recommended.png';

import './rate-landing-about.styl';
import { appLocaleType } from 'app/pages/app/app.types';

const propTypes = {
  locale: appLocaleType.isRequired,
};

const ratingData = [
  {
    type: 'exceptional',
    icon: exeptionalIcon,
  },
  {
    type: 'recommended',
    icon: recommendedIcon,
  },
  {
    type: 'meh',
    icon: mehIcon,
  },
  {
    type: 'skip',
    icon: skipIcon,
  },
];

/* eslint-disable-next-line react/prop-types */
const RatingItem = ({ type, icon }) => {
  if (!type) {
    return null;
  }

  const className = cn('rate-landing-about__rating-icon', `rate-landing-about__rating-icon_${type}`);

  return (
    <Fragment key={type}>
      <dt className={className}>
        <img src={icon} width="72" alt={type} />
      </dt>
      <dd className="rate-landing-about__rating-info">
        <span className="rate-landing-about__rating-heading">{trans(`shared.rating_${type}`)}</span>
        <span className="rate-landing-about__rating-text">{trans(`rate_games.rating_${type}`)}</span>
      </dd>
    </Fragment>
  );
};

const RateLandingAbout = ({ locale }) => {
  const isEn = locale === 'en';

  return (
    <div className="rate-landing-about">
      <div className="rate-landing-about__head">
        <Heading className="rate-landing-about__heading" rank={2}>
          {isEn && (
            <picture className="rate-landing-about__heading-image">
              <source media={styleVars.bp.desktop} srcSet={paths.svgImagePath(headingEn)} />
              <source media={styleVars.bp.phone} srcSet={paths.svgImagePath(headingMobEn)} />
              <img src={paths.svgImagePath(headingEn)} alt="How it works" />
            </picture>
          )}
          {!isEn && (
            <img
              className="rate-landing-about__heading-image"
              src={paths.svgImagePath(headingRu)}
              alt="Как это работает"
            />
          )}
        </Heading>
        <p className="rate-landing-about__description">{trans('rate_games.about')}</p>
      </div>
      <dl className="rate-landing-about__rating-list">{ratingData.map(RatingItem)}</dl>
    </div>
  );
};

RateLandingAbout.propTypes = propTypes;

export default RateLandingAbout;
