import React, { Component } from 'react';
import PropTypes from 'prop-types';
import cn from 'classnames';
import { connect } from 'react-redux';

import Button from 'app/ui/button';
import Dropdown from 'app/ui/dropdown/dropdown';
import SimpleIntlMessage from 'app/components/simple-intl-message/simple-intl-message';
import ConfirmButton from 'app/ui/confirm-button/confirm-button';
import { changeGameAccounts } from 'app/components/game-accounts/game-accounts.actions';

import './connect-button.styl';

const componentPropertyTypes = {
  className: PropTypes.string,
  isConnected: PropTypes.bool.isRequired,
  dispatch: PropTypes.func.isRequired,
  accountId: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
  isError: PropTypes.bool.isRequired,
};

const defaultProps = {
  className: '',
};

@connect(() => ({}))
class ConnectButton extends Component {
  static propTypes = componentPropertyTypes;

  constructor(props) {
    super(props);

    this.state = {
      isOpened: false,
    };
  }

  dropdownClose = () => {
    this.setState({ isOpened: false });
  };

  disconnectAccount = () => {
    const { dispatch, accountId } = this.props;

    dispatch(changeGameAccounts({ [accountId]: '' }));
    this.dropdownClose();
  };

  render() {
    const { className, isConnected, onClick, isError } = this.props;
    const { isOpened } = this.state;

    return isConnected ? (
      <Dropdown
        opened={isOpened}
        className={cn('connect-button__dropdown', className)}
        containerClassName="connect-button__dropdown-container"
        kind="sharing"
        renderedButton={
          <Button kind="fill" size="medium" className={cn('connect-button', 'connect-button_disconnect')}>
            <SimpleIntlMessage id="game_accounts.disconnect_button" />
          </Button>
        }
        renderedContent={
          <div className="connect-button__content">
            <div className="connect-button__dropdown-title">
              <SimpleIntlMessage id="game_accounts.dropdown_title" />
            </div>
            <div className="connect-button__dropdown-text">
              <SimpleIntlMessage id="game_accounts.dropdown_text" />
            </div>
            <div className="connect-button__confirm-wrap">
              <ConfirmButton isYes className="connect-button__confirm_yes" onClick={this.disconnectAccount} />
              <ConfirmButton onClick={this.dropdownClose} />
            </div>
          </div>
        }
      />
    ) : (
      <Button
        kind="fill"
        size="medium"
        className={cn('connect-button')}
        onClick={typeof onClick === 'function' ? onClick : () => {}}
      >
        {isError ? (
          <SimpleIntlMessage id="game_accounts.connect_button_more" />
        ) : (
          <SimpleIntlMessage id="game_accounts.connect_button" />
        )}
      </Button>
    );
  }
}

ConnectButton.defaultProps = defaultProps;

export default ConnectButton;
