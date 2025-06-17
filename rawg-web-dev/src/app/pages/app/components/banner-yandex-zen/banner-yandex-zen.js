import React from 'react';
import PropTypes from 'prop-types';
import SVGInline from 'react-svg-inline';
import { Link } from 'app/components/link';

import getBooleanCookie from 'tools/get-boolean-cookie';

import Button from 'app/ui/button';
import Arrow from 'app/ui/arrow';

import closeIcon from 'assets/icons/close.svg';

import './banner-yandex-zen.styl';

export const hideYandexZenBannerCookie = 'hideYandexZenBanner';
export const bannerYandexZenEnabled = ({ requestCookies, firstPage, appLocale }) => {
  if (!firstPage || appLocale !== 'ru') {
    return false;
  }

  const isHidden = getBooleanCookie(requestCookies, hideYandexZenBannerCookie, false);

  return !isHidden;
};

const link = 'https://vk.cc/9P0Ahe';

const propTypes = {
  onHideBanner: PropTypes.func.isRequired,
};

const BannerYandexZen = ({ onHideBanner }) => {
  return (
    <div className="banner-yandex-zen">
      <div className="banner-yandex-zen__left-imgs">
        <div className="banner-yandex-zen__left-imgs__img1" />
        <div className="banner-yandex-zen__left-imgs__img2" />
        <div className="banner-yandex-zen__left-imgs__img3" />
        <div className="banner-yandex-zen__left-imgs__img4" />
      </div>
      <div className="banner-yandex-zen__main">
        <Link className="banner-yandex-zen__link-img" to={link} rel="nofollow" target="_blank">
          <div className="banner-yandex-zen__text-img" />
        </Link>
        {/* <h3 className="banner-yandex-zen__main__title"> // Замена текста на изображение для seo
          <SimpleIntlMessage id="showcase.welcome_title1" />
          <SimpleIntlMessage
            className="banner-yandex-zen__main__title__inner"
            id="showcase.welcome_title2"
          />
        </h3>
        <div className="banner-yandex-zen__main__steps">
          {steps.map(({
            key, icon, title, subtitle, url,
          }) => (
            <Link to={url} href={url} key={key} className="banner-yandex-zen__main__step">
              <div className="banner-yandex-zen__main__step__phone-icon">
              <SVGInline svg={icon.bannerPhone} /></div>
              <div className="banner-yandex-zen__main__step__first">
              {title}<SVGInline svg={icon.banner} /></div>
              <div className="banner-yandex-zen__main__step__second">{subtitle}</div>
            </Link>
          ))}
        </div> */}
        <div className="banner-yandex-zen__main__links">
          <Link className="banner-yandex-zen__main__link" to={link} rel="nofollow" target="_blank">
            <Button size="medium" kind="fill-inline">
              <div>
                Посмотреть
                <Arrow size="small" direction="right" />
              </div>
            </Button>
          </Link>
        </div>
      </div>
      <div className="banner-yandex-zen__right-imgs">
        <div className="banner-yandex-zen__right-imgs__img5" />
        <div className="banner-yandex-zen__right-imgs__img6" />
        <div className="banner-yandex-zen__right-imgs__img7" />
        <div className="banner-yandex-zen__right-imgs__img8" />
        <div className="banner-yandex-zen__right-imgs__img9" />
        <div className="banner-yandex-zen__right-imgs__img10" />
        <div className="banner-yandex-zen__right-imgs__img11" />
        <div className="banner-yandex-zen__right-imgs__img12" />
      </div>
      <SVGInline className="close-btn" svg={closeIcon} onClick={onHideBanner} />
    </div>
  );
};

BannerYandexZen.propTypes = propTypes;

export default BannerYandexZen;
