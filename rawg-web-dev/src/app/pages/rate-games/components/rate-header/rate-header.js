import React from 'react';
import PropTypes from 'prop-types';
import { compose } from 'recompose';
import { hot } from 'react-hot-loader';
import isFinite from 'lodash/isFinite';

import Heading from 'app/ui/heading/heading';
import SimpleIntlMessage from 'app/components/simple-intl-message';

import appHelper from 'app/pages/app/app.helper';
import RatePercent from '../rate-percent';

import './rate-header.styl';

const hoc = compose(hot(module));

const componentPropertyTypes = {
  header: PropTypes.string.isRequired,
  size: PropTypes.string.isRequired,
  percent: PropTypes.number,
};

const defaultProps = {
  percent: undefined,
};

const RateHeaderComponent = ({ header, size, percent }) => (
  <div className="rate-header">
    <div className="rate-header__wrap">
      <Heading className="rate-header__title" rank={2}>
        <SimpleIntlMessage id={`profile.${header}`} />
      </Heading>
    </div>
    {appHelper.isDesktopSize({ size }) && isFinite(percent) && (
      <RatePercent className="rate-header__percent" percent={percent} />
    )}
  </div>
);

RateHeaderComponent.propTypes = componentPropertyTypes;
RateHeaderComponent.defaultProps = defaultProps;

const RateHeader = hoc(RateHeaderComponent);

export default RateHeader;
