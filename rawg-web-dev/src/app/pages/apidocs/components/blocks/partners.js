import React from 'react';
import PropTypes from 'prop-types';

import SVGInline from 'react-svg-inline';
import Slider from 'app/ui/slider';
import ResponsiveImage from 'app/ui/responsive-image';

import yandexIcon from '../../assets/yandex.svg';
import redditIcon from '../../assets/reddit.svg';
import dtfIcon from '../../assets/dtf.svg';
import discordIcon from '../../assets/discord-wide.svg';
import telegramImage from '../../assets/images/telegram.png';
import telegramImage2x from '../../assets/images/telegram@2x.png';

const partners = [
  {
    variant: 'yandex',
    icon: yandexIcon,
    text: 'Yandex uses RAWG to create new and enrich existing reference cards in its search engine results.',
    url: 'https://yandex.ru',
  },
  {
    variant: 'discord',
    icon: discordIcon,
    text: 'The games search in the Erisly bot on Discord. Over 70,000 connected Discord servers use it.',
    url: 'https://erisly.com/',
  },
  {
    variant: 'reddit',
    icon: redditIcon,
    text: 'The Reddit recommendations games bot by Laundmo. Over 60,000 redditors can use it.',
    url: 'https://www.reddit.com/user/GameSuggestionsBot',
  },
  {
    variant: 'telegram',
    iconAsImage: true,
    // svg сделана через шрифт, шрифта нет - всё едет
    icon: (
      <ResponsiveImage
        className="partner__icon"
        image={{ simple: telegramImage, retina: telegramImage2x }}
        title="telegram"
        alt="telegram"
      />
    ),
    text: 'The Telegram bot by Roman (PHP, Github).',
    url: 'https://t.me/rawgthebot',
  },
  {
    variant: 'dtf',
    icon: dtfIcon,
    text: 'The DTF bot by Samat (Python, Github). DTF is one of the largest Russian gaming news website.',
    url: 'https://dtf.ru/team/47794-rawg-bot-v-kommentariyah-dtf-i-zapusk-publichnogo-api',
  },
];

const renderPartner = ({ icon, text, variant, url, iconAsImage }) => (
  <div className="apidocs-partners__partner-wrap" key={variant}>
    <a
      className={`partner apidocs-partners__partner _${variant}`}
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      draggable="false"
      onDragStart={(e) => e.preventDefault()}
    >
      {iconAsImage ? icon : <SVGInline className="partner__icon" svg={icon} />}
      <p className="partner__text apidocs-lead">{text}</p>
    </a>
  </div>
);

renderPartner.propTypes = {
  icon: PropTypes.any.isRequired,
  text: PropTypes.string.isRequired,
  url: PropTypes.string.isRequired,
  iconAsImage: PropTypes.bool.isRequired,
  variant: PropTypes.string.isRequired,
};

export const getBlockPartners = ({ isPhone = false }) => (
  <div className="apidocs-partners">
    <h2 className="apidocs-partners__title apidocs-h2">Some apps using our API</h2>
    <div className="apidocs-partners__list">
      <Slider
        arrows={false}
        adaptiveHeight={false}
        infinite
        variableWidth
        slidesToScroll={1}
        slidesToShow={isPhone ? 1 : 3}
        initialSlide={isPhone ? 0 : 1}
        swipeToSlide
        centerMode
      >
        {partners.map(renderPartner)}
      </Slider>
    </div>
  </div>
);

getBlockPartners.propTypes = {
  isPhone: PropTypes.bool.isRequired,
};
