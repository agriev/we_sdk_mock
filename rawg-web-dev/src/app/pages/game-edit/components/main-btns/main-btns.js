import React from 'react';
import PropTypes from 'prop-types';
import cn from 'classnames';
import SVGInline from 'react-svg-inline';

import Button from 'app/ui/button';
import trans from 'tools/trans';

import closeIcon from 'assets/icons/close.svg';
import checkIcon from 'assets/icons/check.svg';

import './main-btns.styl';

class MainBtns extends React.Component {
  static propTypes = {
    submitting: PropTypes.bool.isRequired,
    saveDisabled: PropTypes.bool,
    onSave: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired,
  };

  static defaultProps = {
    saveDisabled: false,
  };

  constructor(props) {
    super(props);

    this.state = {
      delPopupOpened: false,
    };
  }

  componentDidMount() {
    window.addEventListener('click', this.onClickOnAnyPlace);
  }

  componentWillUnmount() {
    window.removeEventListener('click', this.onClickOnAnyPlace);
  }

  onClickOnAnyPlace = (event) => {
    if (!this.state.delPopupOpened) {
      return;
    }

    const root = this.rootEl;

    if (root !== event.target && !root.contains(event.target)) {
      this.setState({ delPopupOpened: false });
    }
  };

  onCloseClick = (event) => {
    event.stopPropagation();
    this.setState({ delPopupOpened: true });
  };

  onDeleteYesClick = (event) => {
    event.stopPropagation();

    const { onCancel } = this.props;

    this.setState({ delPopupOpened: false });

    onCancel();
  };

  onDeleteNoClick = (event) => {
    event.stopPropagation();

    this.setState({ delPopupOpened: false });
  };

  onPopuplick = (event) => {
    if (
      event.target !== this.closePopupBtnYesEl &&
      event.target !== this.closePopupBtnNoEl &&
      !this.closePopupBtnYesEl.contains(event.target) &&
      !this.closePopupBtnNoEl.contains(event.target)
    ) {
      event.stopPropagation();
    }
  };

  onCancelClick = () => {
    this.setState({ delPopupOpened: true });
  };

  rootRef = (element) => {
    this.rootEl = element;
  };

  closePopupBtnYesRef = (element) => {
    this.closePopupBtnYesEl = element;
  };

  closePopupBtnNoRef = (element) => {
    this.closePopupBtnNoEl = element;
  };

  render() {
    const { onSave, submitting, saveDisabled } = this.props;
    const { delPopupOpened } = this.state;

    return (
      <>
        <Button
          className="game-edit__save-btn"
          onClick={onSave}
          disabled={submitting || saveDisabled}
          loading={submitting}
        >
          {trans('shared.save')}
        </Button>
        <div ref={this.rootRef} className="game-edit__cancel-btn-wrapper">
          <Button className="game-edit__cancel-btn" onClick={this.onCancelClick}>
            {trans('shared.cancel')}
          </Button>
          <div
            className={cn('game-edit__cancel-btn__close-popup', {
              'game-edit__cancel-btn__close-popup_opened': delPopupOpened,
            })}
            onClickCapture={this.onPopuplick}
          >
            {trans('game_edit.cancel_confirm_text')}
            <div className="game-edit__cancel-btn__close-popup__btns">
              <div
                className="game-edit__cancel-btn__close-popup__yes"
                onClickCapture={this.onDeleteYesClick}
                role="button"
                tabIndex={0}
                ref={this.closePopupBtnYesRef}
              >
                <SVGInline svg={checkIcon} />
                Yes
              </div>
              <div
                className="game-edit__cancel-btn__close-popup__no"
                onClickCapture={this.onDeleteNoClick}
                role="button"
                tabIndex={0}
                ref={this.closePopupBtnNoRef}
              >
                <SVGInline svg={closeIcon} />
                No
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }
}

export default MainBtns;
