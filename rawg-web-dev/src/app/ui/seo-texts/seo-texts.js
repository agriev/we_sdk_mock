import React from 'react';
import PropTypes from 'prop-types';
import { compose } from 'recompose';
import { injectIntl } from 'react-intl';
import { hot } from 'react-hot-loader/root';

import isArray from 'lodash/isArray';
import isString from 'lodash/isString';

import { appLocaleType } from 'app/pages/app/app.types';
import intlShape from 'tools/prop-types/intl-shape';

import './seo-texts.styl';

const hoc = compose(
  hot,
  injectIntl,
);

const propTypes = {
  locale: appLocaleType,
  strs: PropTypes.arrayOf(PropTypes.string).isRequired,
  onLocales: PropTypes.oneOfType([PropTypes.arrayOf(PropTypes.string), PropTypes.string]),
  intl: intlShape.isRequired,
  values: PropTypes.shape(),
};

const defaultProps = {
  locale: undefined,
  onLocales: undefined,
  values: undefined,
};

const SeoTextsComponent = ({ intl, strs, locale, onLocales, values }) => {
  if (isString(onLocales) && locale !== onLocales) {
    return null;
  }

  if (isArray(onLocales) && !onLocales.includes(locale)) {
    return null;
  }

  return (
    <ul className="seo-texts">
      {strs.map((string) => (
        <li key={string}>{intl.formatMessage({ id: string }, values)}</li>
      ))}
    </ul>
  );
};

SeoTextsComponent.propTypes = propTypes;
SeoTextsComponent.defaultProps = defaultProps;

const SeoTexts = hoc(SeoTextsComponent);

export default SeoTexts;
