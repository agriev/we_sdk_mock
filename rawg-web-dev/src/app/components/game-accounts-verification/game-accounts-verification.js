import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { connect } from 'react-redux';
import { push } from 'react-router-redux';

import fetch from 'tools/fetch';
import getFetchState, { fetchStateType } from 'tools/get-fetch-state';
import checkFeature from 'tools/hocs/check-feature';

import { appSizeType } from 'app/pages/app/app.types';
import appHelper from 'app/pages/app/app.helper';

import paths from 'config/paths';
import currentUserType from 'app/components/current-user/current-user.types';
import { joinProgram } from 'app/pages/tokens/tokens.actions';
import { updateCurrentUser } from 'app/components/current-user/current-user.actions';

import GameAccountsVerificationForm from './game-accounts-verification-form';
import GameAccountsVerificationHelpblocks from './game-accounts-verification-helpblocks';

import './game-accounts-verification.styl';

@checkFeature('tokens')
@connect((state) => ({
  size: state.app.size,
  fetchState: getFetchState(state),
  token: state.app.token,
  locale: state.app.locale,
  registeredFromTokensPage: state.app.registeredFromTokensPage,
  currentUser: state.currentUser,
}))
class GameAccountsVerification extends React.Component {
  static propTypes = {
    fetchState: fetchStateType.isRequired,
    separatedPageMode: PropTypes.bool,
    size: appSizeType.isRequired,
    registeredFromTokensPage: PropTypes.bool.isRequired,
    dispatch: PropTypes.func.isRequired,
    currentUser: currentUserType.isRequired,
  };

  static defaultProps = {
    separatedPageMode: false,
  };

  constructor(props) {
    super(props);

    this.className = classnames('game-accounts-verification__container', {
      'game-accounts-verification__container_separate-page': props.separatedPageMode,
      'game-accounts-verification__container_inner-page': !props.separatedPageMode,
    });

    this.state = {
      activeInputName: appHelper.isDesktopSize({ size: this.props.size }) ? 'steam' : undefined,
      verifying: false,
      verifyResult: {
        steam_id: {
          confirmed: undefined,
          error: undefined,
        },
        gamer_tag: {
          confirmed: undefined,
          error: undefined,
        },
        psn_online_id: {
          confirmed: undefined,
          error: undefined,
        },
      },
    };
  }

  setActiveInputName = (activeInputName) => {
    this.setState({ activeInputName });
  };

  verifyGameAccounts = (event) => {
    if (event) {
      event.preventDefault();
    }

    const { fetchState: state } = this.props;
    const uri = '/api/users/current/confirm-accounts';

    this.setState({ verifying: true });

    fetch(uri, { method: 'post', state })
      .then((verifyResult) => {
        this.setState({ verifyResult, verifying: false });

        this.props.dispatch(
          updateCurrentUser({
            steam_id_confirm: verifyResult.steam_id.confirmed,
            gamer_tag_confirm: verifyResult.gamer_tag.confirmed,
            psn_online_id_confirm: verifyResult.psn_online_id.confirmed,
          }),
        );
      })
      .catch(() => {
        this.setState({ verifying: false });
      });
  };

  hasConfirmedAccounts = () => {
    const accs = ['steam_id', 'gamer_tag', 'psn_online_id'];
    return accs.some((acc) => this.state.verifyResult[acc].confirmed);
  };

  finishVerifying = () => {
    const { currentUser, registeredFromTokensPage, dispatch } = this.props;
    if (registeredFromTokensPage) {
      dispatch(push(paths.tokensDashboard));

      if (this.hasConfirmedAccounts()) {
        dispatch(joinProgram());
      }
    } else {
      dispatch(push(paths.profile(currentUser.slug)));
    }
  };

  render() {
    const { separatedPageMode } = this.props;
    const { activeInputName, verifyResult, verifying } = this.state;

    return (
      <div className={this.className}>
        <GameAccountsVerificationForm
          separatedPageMode={separatedPageMode}
          activeInputName={activeInputName}
          setActiveInputName={this.setActiveInputName}
          verifying={verifying}
          verifyResult={verifyResult}
          verifyGameAccounts={this.verifyGameAccounts}
          finishVerifying={this.finishVerifying}
          hasConfirmedAccounts={this.hasConfirmedAccounts}
        />
        <GameAccountsVerificationHelpblocks
          activeInputName={activeInputName}
          setActiveInputName={this.setActiveInputName}
        />
      </div>
    );
  }
}

export default GameAccountsVerification;
