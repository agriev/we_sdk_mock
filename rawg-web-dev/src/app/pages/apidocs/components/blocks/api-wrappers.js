import React from 'react';
import PropTypes from 'prop-types';

import Slider from 'app/ui/slider';
import SVGInline from 'react-svg-inline';

import pythonLightIcon from '../../assets/python-light.svg';
import pythonDarkIcon from '../../assets/python-dark.svg';
import androidIcon from '../../assets/android.svg';
import nodejsIcon from '../../assets/nodejs.svg';
import phpIcon from '../../assets/php.svg';
import goIcon from '../../assets/golang.svg';

const apiWrappers = [
  {
    name: 'Python',
    variant: 'light',
    author: 'by Laundmo',
    icon: pythonDarkIcon,
    url: 'https://pypi.org/project/rawgpy/',
  },
  {
    name: 'Python',
    variant: 'dark',
    author: 'by uburuntu',
    icon: pythonLightIcon,
    url: 'https://github.com/uburuntu/rawg',
  },
  {
    name: 'Android',
    variant: 'android',
    author: 'by Gruzer',
    icon: androidIcon,
    url: 'https://github.com/Gruzer/Android-RAWG-API-Wrapper',
  },
  {
    name: 'Node',
    variant: 'light',
    author: 'by orels1',
    icon: nodejsIcon,
    url: 'https://www.npmjs.com/package/rawger',
  },
  {
    name: 'PHP',
    variant: 'light',
    author: 'by dimuska139',
    icon: phpIcon,
    url: 'https://github.com/dimuska139/rawg-sdk-php',
  },
  {
    name: 'Go',
    variant: 'dark',
    author: 'by dimuska139',
    icon: goIcon,
    url: 'https://github.com/dimuska139/rawg-sdk-go',
  },
];

const renderApiWrapper = ({ icon, name, author, variant, url }) => (
  <div className="apidocs-api-wrappers__api-wrapper-wrap" key={name}>
    <a
      className={`api-wrapper apidocs-api-wrappers__api-wrapper _${variant}`}
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      draggable="false"
      onDragStart={(e) => e.preventDefault()}
    >
      <p className="api-wrapper__text apidocs-lead">
        <b className="api-wrapper__name">{name}</b>
        {author}
      </p>
      <SVGInline className="api-wrapper__icon" svg={icon} />
    </a>
  </div>
);

renderApiWrapper.propTypes = {
  icon: PropTypes.any.isRequired,
  name: PropTypes.string.isRequired,
  author: PropTypes.string.isRequired,
  variant: PropTypes.string.isRequired,
  url: PropTypes.string.isRequired,
};

// prettier-ignore
export const getBlockApiWrappers = ({ isPhone = false, rawgEmail }) => (
  <div className="apidocs-api-wrappers">
    <h2 className="apidocs-api-wrappers__title apidocs-h2">
      API wrappers by our community
    </h2>
    <p className="apidocs-api-wrappers__description apidocs-lead">
      All of the libraries are contributed by our users. If you find a bug or missing
      feature, it's best to contact the author. If you want to submit your wrapper,
      contact us via {rawgEmail}
    </p>
    <div className="apidocs-api-wrappers__slider">
      <Slider
        arrows={false}
        adaptiveHeight={false}
        infinite={!isPhone}
        variableWidth
        slidesToScroll={1}
        slidesToShow={isPhone ? 1 : 3}
        swipeToSlide
        centerMode={!isPhone}
      >
        {apiWrappers.map(renderApiWrapper)}
      </Slider>
    </div>
  </div>
);

getBlockApiWrappers.propTypes = {
  isPhone: PropTypes.bool.isRequired,
  rawgEmail: PropTypes.any.isRequired,
};
