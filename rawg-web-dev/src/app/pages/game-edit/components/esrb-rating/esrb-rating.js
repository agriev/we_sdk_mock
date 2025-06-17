/* eslint-disable jsx-a11y/no-onchange */

import React from 'react';
import PropTypes from 'prop-types';
import { hot } from 'react-hot-loader';
import { injectIntl } from 'react-intl';
import { connect } from 'react-redux';
import cn from 'classnames';
import SVGInline from 'react-svg-inline';

import path from 'ramda/src/path';
import defaultTo from 'ramda/src/defaultTo';

import ratingIcon from 'assets/icons/rating.svg';

import { updateField } from 'app/pages/game-edit/actions/common';
import SimpleIntlMessage from 'app/components/simple-intl-message';
import { esrbRatings } from 'app/pages/app/app.types';
import { esrbTitles } from 'app/pages/game/game.types';

import './esrb-rating.styl';

@hot(module)
@injectIntl
@connect((state, props) => ({
  currentValue: path(['gameEdit', props.name, 'current'], state),
  changedValue: path(['gameEdit', props.name, 'changed'], state),
  ratings: state.app.esrbRatings,
}))
class ESRBRating extends React.Component {
  static propTypes = {
    currentValue: PropTypes.number,
    changedValue: PropTypes.number,
    dispatch: PropTypes.func.isRequired,
    name: PropTypes.string.isRequired,
    ratings: esrbRatings.isRequired,
  };

  static defaultProps = {
    currentValue: undefined,
    changedValue: undefined,
  };

  constructor(props) {
    super(props);

    this.state = {
      opened: false,
    };
  }

  componentDidMount() {
    window.addEventListener('click', this.onClickOnAnyPlace);
  }

  componentWillUnmount() {
    window.removeEventListener('click', this.onClickOnAnyPlace);
  }

  onClickOnAnyPlace = (event) => {
    if (!this.state.opened) {
      return;
    }

    const root = this.rootEl;

    if (root !== event.target && !root.contains(event.target)) {
      this.setState({ opened: false });
    }
  };

  onClickOnValue = () => {
    this.setState({ opened: true });
  };

  onRatingClick = (event) => {
    const selectedId = parseInt(event.currentTarget.getAttribute('data-id'), 10);
    const { name, dispatch } = this.props;
    dispatch(updateField(name, selectedId));
    this.setState({ opened: false });
  };

  rootRef = (element) => {
    this.rootEl = element;
  };

  render() {
    const { opened } = this.state;
    const { currentValue, changedValue, ratings } = this.props;
    const currentRating = defaultTo(currentValue, changedValue);

    return (
      <>
        <div
          className={cn('game-edit__esrb__form-overlay', {
            'game-edit__esrb__form-overlay_opened': opened,
          })}
        />
        <div className="game-edit__esrb" ref={this.rootRef}>
          <div className="game-edit__esrb__value" onClick={this.onClickOnValue} role="button" tabIndex={0}>
            <SVGInline className="game-edit__esrb__value-icon" svg={ratingIcon} width="20px" height="20px" />
            {esrbTitles[currentRating] || '-'}
          </div>
          <div
            className={cn('game-edit__esrb__form', {
              'game-edit__esrb__form_opened': opened,
            })}
          >
            <div className="game-edit__esrb__form__header">
              <div className="game-edit__esrb__form__header-title">
                <SimpleIntlMessage id="game_edit.field_esrb_rating" />
              </div>
            </div>
            <div className="game-edit__esrb__form__btns">
              {ratings.map((rating) => (
                <div
                  key={rating.id}
                  data-id={rating.id}
                  onClick={this.onRatingClick}
                  role="button"
                  tabIndex={0}
                  className={cn('game-edit__esrb__form__btn', {
                    'game-edit__esrb__form__btn_active': currentRating === rating.id,
                  })}
                >
                  <div className="game-edit__esrb__form__btn-age">{esrbTitles[rating.id]}</div>
                  <div className="game-edit__esrb__form__btn-title">{rating.name}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </>
    );
  }
}

export default ESRBRating;
