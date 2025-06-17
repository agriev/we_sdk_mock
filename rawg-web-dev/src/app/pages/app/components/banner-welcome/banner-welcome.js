import React from 'react';
import PropTypes from 'prop-types';
import SVGInline from 'react-svg-inline';
import { Link } from 'app/components/link';

import paths from 'config/paths';

import getBooleanCookie from 'tools/get-boolean-cookie';
import SimpleIntlMessage from 'app/components/simple-intl-message';

import Button from 'app/ui/button';
import Arrow from 'app/ui/arrow';

import closeIcon from 'assets/icons/close.svg';

import './banner-welcome.styl';

export const hideWelcomeBannerCookie = 'hideWelcomeBanner';
export const bannerWelcomeEnabled = ({ requestCookies, currentUser, firstPage }) => {
  if (currentUser.id || firstPage) {
    return false;
  }

  const isHidden = getBooleanCookie(requestCookies, hideWelcomeBannerCookie, false);

  return !isHidden;
};

const registerLink = `${paths.register}?from=signup_banner`;

const propTypes = {
  onHideBanner: PropTypes.func.isRequired,
};

const BannerWelcome = ({ onHideBanner }) => {
  return (
    <div className="welcome-banner">
      <div className="welcome-banner__left-imgs">
        <div className="welcome-banner__left-imgs__img1" />
        <div className="welcome-banner__left-imgs__img2" />
        <div className="welcome-banner__left-imgs__img3" />
        <div className="welcome-banner__left-imgs__img4" />
      </div>
      <div className="welcome-banner__main">
        <Link className="welcome-banner__link-img" to={registerLink} rel="nofollow">
          <div className="welcome-banner__text-img" />
        </Link>
        {/* <h3 className="welcome-banner__main__title"> // Замена текста на изображение для seo
          <SimpleIntlMessage id="showcase.welcome_title1" />
          <SimpleIntlMessage
            className="welcome-banner__main__title__inner"
            id="showcase.welcome_title2"
          />
        </h3>
        <div className="welcome-banner__main__steps">
          {steps.map(({
            key, icon, title, subtitle, url,
          }) => (
            <Link to={url} href={url} key={key} className="welcome-banner__main__step">
              <div className="welcome-banner__main__step__phone-icon">
              <SVGInline svg={icon.bannerPhone} /></div>
              <div className="welcome-banner__main__step__first">
              {title}<SVGInline svg={icon.banner} /></div>
              <div className="welcome-banner__main__step__second">{subtitle}</div>
            </Link>
          ))}
        </div> */}
        <div className="welcome-banner__main__links">
          <Link className="welcome-banner__main__link" to={registerLink} rel="nofollow">
            <Button size="medium" kind="fill-inline">
              <div>
                <SimpleIntlMessage id="welcome.signup" />
                <Arrow size="small" direction="right" />
              </div>
            </Button>
          </Link>
        </div>
      </div>
      <div className="welcome-banner__right-imgs">
        <div className="welcome-banner__right-imgs__img5" />
        <div className="welcome-banner__right-imgs__img6" />
        <div className="welcome-banner__right-imgs__img7" />
        <div className="welcome-banner__right-imgs__img8" />
        <div className="welcome-banner__right-imgs__img9" />
        <div className="welcome-banner__right-imgs__img10" />
        <div className="welcome-banner__right-imgs__img11" />
        <div className="welcome-banner__right-imgs__img12" />
      </div>
      <SVGInline className="close-btn" svg={closeIcon} onClick={onHideBanner} />
    </div>
  );
};

BannerWelcome.propTypes = propTypes;

export default BannerWelcome;
