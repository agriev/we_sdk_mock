import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { compose } from 'recompose';
import { hot } from 'react-hot-loader/root';
import { injectIntl } from 'react-intl';

// import './switcher.styl';

import intlShape from 'tools/prop-types/intl-shape';

import ToggleButton from 'app/ui/toggle-button';

import { setOnlyMyPlatforms } from './switcher.actions';

const hoc = compose(
  hot,
  injectIntl,
);

const propTypes = {
  onlyMyPlatforms: PropTypes.bool,
  dispatch: PropTypes.func.isRequired,
  intl: intlShape.isRequired,
};

const defaultProps = {
  onlyMyPlatforms: null,
};

const SwitcherOnlyMyPlatformsComponent = ({ intl, onlyMyPlatforms, dispatch }) => {
  const onChange = useCallback(() => {
    const isEnabled = onlyMyPlatforms === undefined || onlyMyPlatforms === true;
    dispatch(setOnlyMyPlatforms(!isEnabled));
  }, [onlyMyPlatforms]);

  return (
    <ToggleButton
      className="switcher-only-my-platforms"
      text={intl.formatMessage({ id: 'shared.filter_only_my_platforms' })}
      onChange={onChange}
      enabled={onlyMyPlatforms === undefined || onlyMyPlatforms === true}
    />
  );
};

SwitcherOnlyMyPlatformsComponent.propTypes = propTypes;
SwitcherOnlyMyPlatformsComponent.defaultProps = defaultProps;

const SwitcherOnlyMyPlatforms = hoc(SwitcherOnlyMyPlatformsComponent);

export default SwitcherOnlyMyPlatforms;
