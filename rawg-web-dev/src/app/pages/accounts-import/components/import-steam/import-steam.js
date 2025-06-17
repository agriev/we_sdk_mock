/* eslint-disable no-restricted-globals, no-mixed-operators, camelcase */
/* global screen */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import SVGInline from 'react-svg-inline';

import { sendAnalyticsGamesImport } from 'scripts/analytics-helper';

import { appLocaleType } from 'app/pages/app/app.types';

import Button from 'app/ui/button/button';
import SimpleIntlMessage from 'app/components/simple-intl-message/simple-intl-message';
import steamIcon from 'assets/icons/stores/steam.svg';
import { changeGameAccounts } from 'app/components/game-accounts/game-accounts.actions';
import currentUserTypes from 'app/components/current-user/current-user.types';
import socialAccountsHelper from 'app/components/social-accounts/social-accounts.helper';
import Error from 'app/ui/error';

import { PROFILE_GAMES_IMPORT_SUBMIT } from 'app/pages/profile/profile.actions';

import './import-steam.styl';

const componentPropertyTypes = {
  locale: appLocaleType.isRequired,

  className: PropTypes.string,
  currentUser: currentUserTypes.isRequired,
  dispatch: PropTypes.func.isRequired,
  status: PropTypes.string,
  authProviderError: PropTypes.string,
};

const defaultProps = {
  className: '',
  status: '',
  authProviderError: '',
};

@connect((state) => ({
  currentUser: state.currentUser,
  locale: state.app.locale,
  authProviderError: state.app.authProviderError,
}))
class ImportSteam extends Component {
  static propTypes = componentPropertyTypes;

  constructor(props) {
    super(props);

    this.state = {};
  }

  componentDidUpdate(previousProperties) {
    const {
      currentUser: { steam_id },
    } = this.props;

    if (previousProperties.currentUser.steam_id !== steam_id) {
      this.steamImport();
    }
  }

  handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const {
      locale,
      currentUser: { steam_id: steamId },
    } = this.props;

    if (steamId && steamId.length > 0) {
      this.steamImport();
    } else {
      const { width, height } = {
        width: 800,
        height: 400,
      };
      const left = screen.width / 2 - width / 2;
      const top = screen.height / 2 - height / 2;

      window.open(
        socialAccountsHelper.getProviderAddress('steam', locale),
        '',
        `width=${width},height=${height},top=${top},left=${left}`,
      );
    }
  };

  steamDisconnect = () => {
    const { dispatch } = this.props;
    return dispatch(changeGameAccounts({ steam_id: '' }, { redirect: false }));
  };

  steamImport = () => {
    const {
      dispatch,
      currentUser: { steam_id: steamId },
    } = this.props;

    dispatch({ type: PROFILE_GAMES_IMPORT_SUBMIT });
    sendAnalyticsGamesImport('steam');

    return dispatch(changeGameAccounts({ steam_id: steamId }, { redirect: true }));
  };

  privateErrorMessage = () => {
    const { className, status } = this.props;
    return (
      <div className={['import-steam', className].join(' ')}>
        <Button
          size="medium"
          kind="fill"
          loading={status === 'process'}
          onClick={this.steamImport}
          className="import-steam__button"
        >
          <SimpleIntlMessage id="game_accounts.relaunch" />
        </Button>
        <Button
          size="medium"
          kind="fill"
          loading={status === 'process'}
          onClick={this.steamDisconnect}
          className="import-steam__button import-steam__button_disconnect"
        >
          <SimpleIntlMessage id="game_accounts.disconnect_button" />
        </Button>
        <div className="import-steam__error-wrap">
          <SimpleIntlMessage
            id="game_accounts.import_private_error"
            values={{ account: 'Steam' }}
            className="import-steam__error import-steam__error-arrow"
          />
        </div>
      </div>
    );
  };

  render() {
    const { className, status, authProviderError } = this.props;

    return status && (status === 'private-user' || status === 'private-games') ? (
      this.privateErrorMessage()
    ) : (
      <div className={['import-steam', className].join(' ')}>
        <Button
          kind="fill"
          size="medium"
          className="import-steam__button"
          onClick={this.handleClick}
          loading={status === 'process'}
        >
          <SimpleIntlMessage id="game_accounts.steam_sign" />
          <SVGInline svg={steamIcon} className="import-steam__icon" />
        </Button>
        <SimpleIntlMessage id="game_accounts.valve" className="import-steam__valve-message" />
        <div className="import-steam__error-wrap">
          {authProviderError && <Error error={authProviderError} kind="form" className="import-steam__auth-error" />}
        </div>
      </div>
    );
  }
}

ImportSteam.defaultProps = defaultProps;

export default ImportSteam;
