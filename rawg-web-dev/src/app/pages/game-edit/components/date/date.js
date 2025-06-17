/* eslint-disable jsx-a11y/no-onchange */
/* eslint-disable no-mixed-operators */

import React from 'react';
import PropTypes from 'prop-types';
import { hot } from 'react-hot-loader';
import { injectIntl } from 'react-intl';
import { connect } from 'react-redux';
import cn from 'classnames';
import SVGInline from 'react-svg-inline';

import range from 'lodash/range';
import padStart from 'lodash/padStart';

import path from 'ramda/src/path';
import defaultTo from 'ramda/src/defaultTo';

import getCurrentYear from 'tools/dates/current-year';

import calendarIcon from 'assets/icons/calendar.svg';

import SimpleIntlMessage from 'app/components/simple-intl-message';

import { updateField } from 'app/pages/game-edit/actions/common';

import './date.styl';

const months = {
  1: 'January',
  2: 'February',
  3: 'March',
  4: 'April',
  5: 'May',
  6: 'June',
  7: 'July',
  8: 'August',
  9: 'September',
  10: 'October',
  11: 'November',
  12: 'December',
};

const years = range(0, 80).map((_, i) => getCurrentYear() + 10 - i);
const daysInMonth = (year, month) => new Date(year || 2000, month || 1, 0).getDate();
const padZero = (number) => (number ? padStart(number, 2, '0') : '01');

const getCurrentDate = ({ currentValue, changedValue }) => {
  if (changedValue || currentValue) {
    const date = new Date(changedValue || currentValue);
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    return { day, month, year };
  }

  return { day: '', month: '', year: '' };
};

@hot(module)
@injectIntl
@connect((state, props) => ({
  currentValue: path(['gameEdit', props.name, 'current'], state),
  changedValue: path(['gameEdit', props.name, 'changed'], state),
  currentTBAValue: path(['gameEdit', 'tba', 'current'], state),
  changedTBAValue: path(['gameEdit', 'tba', 'changed'], state),
}))
class ReleaseDate extends React.Component {
  static propTypes = {
    currentValue: PropTypes.string,
    changedValue: PropTypes.string,
    currentTBAValue: PropTypes.bool.isRequired,
    changedTBAValue: PropTypes.bool,
    dispatch: PropTypes.func.isRequired,
    name: PropTypes.string.isRequired,
  };

  static defaultProps = {
    currentValue: '',
    changedValue: undefined,
    changedTBAValue: undefined,
  };

  constructor(props) {
    super(props);

    const { currentValue, changedValue } = this.props;

    const { day, month, year } = getCurrentDate({ currentValue, changedValue });

    this.state = {
      opened: false,
      prevCurrentValue: this.props.currentValue,
      day,
      month,
      year,
    };
  }

  componentDidMount() {
    window.addEventListener('click', this.onClickOnAnyPlace);
  }

  componentWillUnmount() {
    window.removeEventListener('click', this.onClickOnAnyPlace);
  }

  static getDerivedStateFromProps(props, state) {
    if (props.currentValue !== state.prevCurrentValue) {
      const { day, month, year } = getCurrentDate(props);
      return {
        prevCurrentValue: props.currentValue,
        day,
        month,
        year,
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
      const { day, month, year } = getCurrentDate(this.props);
      this.setState({
        opened: false,
        day,
        month,
        year,
      });
    }
  };

  onChangeDay = (event) => {
    this.setState({ day: event.target.value });
  };

  onChangeMonth = (event) => {
    this.setState({ month: event.target.value });
  };

  onChangeYear = (event) => {
    this.setState({ year: event.target.value });
  };

  onClickOnValue = () => {
    const { day, month, year } = getCurrentDate(this.props);

    this.setState({
      opened: true,
      day,
      month,
      year,
    });
  };

  onSaveClick = () => {
    const { name, dispatch } = this.props;

    if (this.state.day && this.state.month && this.state.year) {
      const { day, month, year } = this.state;
      const newDate = this.makeNewDate(day, month, year);
      dispatch(updateField(name, newDate));
      dispatch(updateField('tba', false));
      this.setState({ opened: false });
    }
  };

  onTBAClick = () => {
    const { name, dispatch } = this.props;
    dispatch(updateField(name, ''));
    dispatch(updateField('tba', true));
    this.setState({
      opened: false,
      day: '',
      month: '',
      year: '',
    });
  };

  makeNewDate = (day, month, year) => `${year}-${padZero(month)}-${padZero(day)}`;

  rootRef = (element) => {
    this.rootEl = element;
  };

  render() {
    const { opened } = this.state;
    const { day, month, year } = this.state;
    const { currentTBAValue, changedTBAValue } = this.props;
    const tba = defaultTo(currentTBAValue, changedTBAValue);

    return (
      <>
        <div
          className={cn('game-edit__date__form-overlay', {
            'game-edit__date__form-overlay_opened': opened,
          })}
        />
        <div className="game-edit__date" ref={this.rootRef}>
          <div className="game-edit__date__value" onClick={this.onClickOnValue} role="button" tabIndex={0}>
            <SVGInline className="game-edit__date__value-icon" svg={calendarIcon} width="20px" height="20px" />
            {!tba && (day && month && years ? `${months[month]} ${day}, ${year}` : 'Select a release date')}
            {tba && 'To be announced'}
          </div>
          <div
            className={cn('game-edit__date__form', {
              'game-edit__date__form_opened': opened,
            })}
          >
            <div className="game-edit__date__form__header">
              <div className="game-edit__date__form__header-title">
                <SimpleIntlMessage id="game_edit.field_released" />
              </div>
              <div
                className={cn('game-edit__date__form__header-save', {
                  'game-edit__date__form__header-save_enabled': day && month && year,
                })}
                onClick={this.onSaveClick}
                role="button"
                tabIndex={0}
              >
                <SimpleIntlMessage id="shared.save" />
              </div>
            </div>
            <div className="game-edit__date__form__selects">
              <select value={day} onChange={this.onChangeDay}>
                <option value="">Select a day</option>
                {range(1, daysInMonth(year, month) + 1).map((dy) => (
                  <option value={dy} key={dy}>
                    {dy}
                  </option>
                ))}
              </select>
              <select value={month} onChange={this.onChangeMonth}>
                <option value="">Select a month</option>
                {range(1, 13).map((mnth) => (
                  <option value={mnth} key={mnth}>
                    {months[mnth]}
                  </option>
                ))}
              </select>
              <select value={year} onChange={this.onChangeYear}>
                <option value="">Select a year</option>
                {years.map((yr) => (
                  <option value={yr} key={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>
            <div className="game-edit__date__form__tba-btn" onClick={this.onTBAClick} role="button" tabIndex={0}>
              To Be Announced
            </div>
          </div>
        </div>
      </>
    );
  }
}

export default ReleaseDate;
