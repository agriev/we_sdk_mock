import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { compose } from 'recompose';
import { hot } from 'react-hot-loader/root';

import './theme-switcher.styl';

import ToggleButton from 'app/ui/toggle-button';
import SimpleIntlMessage from 'app/components/simple-intl-message/simple-intl-message';
import { THEME_LIGHT, THEME_DARK } from 'app/pages/app/app.actions';
import { setTheme } from 'app/components/theme-switcher/theme-switcher.actions';

const hoc = compose(hot);

const propTypes = {
  theme: PropTypes.string.isRequired,
  dispatch: PropTypes.func.isRequired,
};

const defaultProps = {
  //
};

const ThemeSwitcherComponent = ({ theme, dispatch }) => {
  const lightActive = theme === THEME_LIGHT;
  const onChange = useCallback(() => {
    dispatch(setTheme(lightActive ? THEME_DARK : THEME_LIGHT));
  }, [lightActive]);

  return (
    <ToggleButton
      className="theme-switcher__button"
      text={<SimpleIntlMessage id="game.review_light_theme" />}
      onChange={onChange}
      enabled={lightActive}
    />
  );
};

ThemeSwitcherComponent.propTypes = propTypes;
ThemeSwitcherComponent.defaultProps = defaultProps;

const ThemeSwitcher = hoc(ThemeSwitcherComponent);

export default ThemeSwitcher;
