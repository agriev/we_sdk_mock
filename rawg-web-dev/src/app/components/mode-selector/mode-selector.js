import React from 'react';
import PropTypes from 'prop-types';
import { compose } from 'recompose';
import { hot } from 'react-hot-loader/root';
import cn from 'classnames';

import SimpleIntlMessage from 'app/components/simple-intl-message';

import { MODE_SELECTOR_COLUMNS, MODE_SELECTOR_LIST } from './mode-selector.helper';

import './mode-selector.styl';

const hoc = compose(hot);

const propTypes = {
  className: PropTypes.string,
  displayMode: PropTypes.string.isRequired,
  setModeHandler: PropTypes.func.isRequired,
};

const defaultProps = {
  className: undefined,
};

const ModeSelectorComponent = ({ className, displayMode, setModeHandler }) => (
  <div className={cn('mode-select', className)}>
    <div className="mode-select__title">
      <SimpleIntlMessage id="discover.mode_select_title" />
    </div>
    <div className="mode-select__items">
      <div
        className={cn('mode-select__item mode-select__item_columns', {
          active: displayMode === MODE_SELECTOR_COLUMNS,
        })}
        onClick={setModeHandler({ mode: MODE_SELECTOR_COLUMNS })}
        role="button"
        tabIndex={0}
      />
      <div
        className={cn('mode-select__item mode-select__item_list', {
          active: displayMode === MODE_SELECTOR_LIST,
        })}
        onClick={setModeHandler({ mode: MODE_SELECTOR_LIST })}
        role="button"
        tabIndex={0}
      />
    </div>
  </div>
);

ModeSelectorComponent.propTypes = propTypes;
ModeSelectorComponent.defaultProps = defaultProps;

const ModeSelector = hoc(ModeSelectorComponent);

export default ModeSelector;
