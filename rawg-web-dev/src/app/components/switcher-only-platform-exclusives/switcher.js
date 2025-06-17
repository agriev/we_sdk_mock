import React from 'react';
import { compose } from 'recompose';
import { hot } from 'react-hot-loader/root';
import { injectIntl } from 'react-intl';
import { stringify } from 'qs';

import omit from 'ramda/src/omit';
import assoc from 'ramda/src/assoc';

// import './switcher.styl';

import intlShape from 'tools/prop-types/intl-shape';

import ToggleButton from 'app/ui/toggle-button';

import locationShape from 'tools/prop-types/location-shape';

export const onlyExclusivesKey = 'platforms_count';

const hoc = compose(
  hot,
  injectIntl,
);

const propTypes = {
  intl: intlShape.isRequired,
  location: locationShape.isRequired,
};

const defaultProps = {};

const SwitcherOnlyPlatformExclusivesComponent = ({ intl, location }) => {
  const enabled = location.query[onlyExclusivesKey] === '1';

  const finalQuery = enabled
    ? omit([onlyExclusivesKey], location.query)
    : assoc(onlyExclusivesKey, '1', location.query);

  const queryString = stringify(finalQuery, { indices: false });

  return (
    <ToggleButton
      className="switcher-only-platforms-exclusives"
      text={intl.formatMessage({ id: 'shared.filter_only_platform_exclusives' })}
      url={`${location.pathname}?${queryString}`}
      enabled={enabled}
    />
  );
};

SwitcherOnlyPlatformExclusivesComponent.propTypes = propTypes;
SwitcherOnlyPlatformExclusivesComponent.defaultProps = defaultProps;

const SwitcherOnlyPlatformExclusives = hoc(SwitcherOnlyPlatformExclusivesComponent);

export default SwitcherOnlyPlatformExclusives;
