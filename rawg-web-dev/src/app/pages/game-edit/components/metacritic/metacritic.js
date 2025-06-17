/* eslint-disable jsx-a11y/no-onchange */

import React from 'react';
import PropTypes from 'prop-types';
import { hot } from 'react-hot-loader';
import { injectIntl } from 'react-intl';
import { connect } from 'react-redux';
import cn from 'classnames';
import SVGInline from 'react-svg-inline';

import intlShape from 'tools/prop-types/intl-shape';

import denormalizeGame from 'tools/redux/denormalize-game';
import metascoreIcon from 'assets/icons/metascore.svg';
import importantIcon from 'assets/icons/important.svg';

import { updateField } from 'app/pages/game-edit/actions/common';
import SimpleIntlMessage from 'app/components/simple-intl-message';

import defaultTo from 'ramda/src/defaultTo';

import './metacritic.styl';

const getCurrentValue = (props) => {
  const { currentValue, changedValue } = props;

  return defaultTo(currentValue, changedValue) || '';
};

const name = 'metacritic_url';

@hot(module)
@injectIntl
@connect((state) => ({
  currentValue: state.gameEdit[name].current,
  changedValue: state.gameEdit[name].changed,
  currentScoreValue: denormalizeGame(state).metacritic,
  currentUrlValue: denormalizeGame(state).metacritic_url,
}))
class Metacritic extends React.Component {
  static propTypes = {
    currentValue: PropTypes.string,
    changedValue: PropTypes.string,
    currentScoreValue: PropTypes.number,
    currentUrlValue: PropTypes.string,
    dispatch: PropTypes.func.isRequired,
    intl: intlShape.isRequired,
  };

  static defaultProps = {
    currentValue: undefined,
    changedValue: undefined,
    currentUrlValue: undefined,
    currentScoreValue: undefined,
  };

  constructor(props) {
    super(props);

    const value = getCurrentValue(this.props);

    this.state = {
      opened: false,
      prevCurrentValue: this.props.currentValue,
      prevChangedValue: this.props.changedValue,
      value,
    };
  }

  componentDidMount() {
    window.addEventListener('click', this.onClickOnAnyPlace);
  }

  componentWillUnmount() {
    window.removeEventListener('click', this.onClickOnAnyPlace);
  }

  static getDerivedStateFromProps(props, state) {
    const oldValue = defaultTo(state.prevCurrentValue, state.prevChangedValue) || '';
    const value = getCurrentValue(props);
    if (oldValue !== value) {
      return {
        prevCurrentValue: props.currentValue,
        prevChangedValue: props.changedValue,
        value,
      };
    }

    return null;
  }

  onClickOnAnyPlace = (event) => {
    if (!this.state.opened) {
      return;
    }

    const root = this.rootEl;

    if (root !== event.target && !root.contains(event.target)) {
      const value = getCurrentValue(this.props);
      this.setState({
        opened: false,
        value,
      });
    }
  };

  onInputChange = (event) => {
    this.setState({ value: event.target.value });
  };

  onInputKeyDown = (event) => {
    if (event.key === 'Enter') {
      this.saveItem();
    }
  };

  onClickOnValue = () => {
    const value = getCurrentValue(this.props);

    this.setState(
      {
        opened: true,
        value,
      },
      () => {
        this.inputEl.focus();
      },
    );
  };

  getValueStr = () => {
    const { value } = this.state;
    const { currentScoreValue, currentUrlValue } = this.props;

    if (value || (currentUrlValue === '' && currentScoreValue)) {
      return currentScoreValue || 'Pending';
    }

    return '-';
  };

  saveItem = () => {
    const { dispatch } = this.props;

    dispatch(updateField(name, this.state.value));
    this.setState({ opened: false });
  };

  rootRef = (element) => {
    this.rootEl = element;
  };

  inputRef = (element) => {
    this.inputEl = element;
  };

  render() {
    const { intl } = this.props;
    const { opened, value } = this.state;

    return (
      <>
        <div
          className={cn('game-edit__metacritic__form-overlay', {
            'game-edit__metacritic__form-overlay_opened': opened,
          })}
        />
        <div className="game-edit__metacritic" ref={this.rootRef}>
          <div className="game-edit__metacritic__value" onClick={this.onClickOnValue} role="button" tabIndex={0}>
            <SVGInline className="game-edit__metacritic__value-icon" svg={metascoreIcon} width="20px" height="20px" />
            {this.getValueStr()}
          </div>
          <div
            className={cn('game-edit__metacritic__form', {
              'game-edit__metacritic__form_opened': opened,
            })}
          >
            <div className="game-edit__metacritic__form__header">
              <div className="game-edit__metacritic__form__header-title">
                <SimpleIntlMessage id="game_edit.field_metacritic_title" />
              </div>
              <div
                className={cn('game-edit__metacritic__form__header-save', {
                  'game-edit__metacritic__form__header-save_enabled': true,
                })}
                onClick={this.saveItem}
                role="button"
                tabIndex={0}
              >
                <SimpleIntlMessage id="shared.save" />
              </div>
            </div>
            <div className="game-edit__metacritic__form__input">
              <input
                type="text"
                onChange={this.onInputChange}
                onKeyDown={this.onInputKeyDown}
                value={value}
                placeholder={intl.formatMessage({
                  id: 'game_edit.field_metacritic_placeholder',
                })}
                ref={this.inputRef}
              />
            </div>
            <div className="game-edit__metacritic__form__help">
              <SVGInline svg={importantIcon} />
              <SimpleIntlMessage id="game_edit.field_metacritic_help" />
            </div>
          </div>
        </div>
      </>
    );
  }
}

export default Metacritic;
