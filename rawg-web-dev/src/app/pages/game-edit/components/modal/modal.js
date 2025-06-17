import React from 'react';
import PropTypes from 'prop-types';
import { hot } from 'react-hot-loader';

import getScrollTop from 'tools/get-scroll-top';

import CloseButton from 'app/ui/close-button';
import SimpleIntlMessage from 'app/components/simple-intl-message';

import './modal.styl';

@hot(module)
class GameEditModal extends React.Component {
  static propTypes = {
    title1: PropTypes.node.isRequired,
    title2: PropTypes.node,
    desc: PropTypes.node,
    onClose: PropTypes.func.isRequired,
    onSave: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired,
    children: PropTypes.node.isRequired,
  };

  static defaultProps = {
    desc: undefined,
  };

  componentDidMount() {
    this.currentScroll = getScrollTop();
    window.document.body.classList.add('no-scroll');
  }

  componentWillUnmount() {
    window.document.body.classList.remove('no-scroll');
    window.scrollTo(0, this.currentScroll);
  }

  render() {
    const { title1, title2, onClose, onSave, onCancel, desc, children } = this.props;

    return (
      <div className="game-edit__modal">
        <div className="game-edit__modal__close-button__container">
          <CloseButton className="game-edit__modal__close-button" onClick={onClose} />
        </div>
        <div className="game-edit__modal-content">
          <div className="game-edit__modal__title">
            <div className="game-edit__modal__title1">{title1}</div>{' '}
            {title2 && <div className="game-edit__modal__title2">{title2}</div>}
          </div>
          {desc && <div className="game-edit__modal__desc">{desc}</div>}
          {children}
        </div>
        <div className="game-edit__modal__btns">
          <div className="game-edit__modal__save-btn" onClick={onSave} role="button" tabIndex={0}>
            <SimpleIntlMessage id="shared.save" />
          </div>
          <div className="game-edit__modal__cancel-btn" onClick={onCancel} role="button" tabIndex={0}>
            <SimpleIntlMessage id="shared.cancel" />
          </div>
        </div>
      </div>
    );
  }
}

export default GameEditModal;
