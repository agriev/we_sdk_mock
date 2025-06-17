import React from 'react';
import PropTypes from 'prop-types';
import cn from 'classnames';
import { connect } from 'react-redux';
import { Link } from 'app/components/link';
import { hot } from 'react-hot-loader/root';
import { FormattedMessage } from 'react-intl';

import prepare from 'tools/hocs/prepare';
import paths from 'config/paths';

import AccountCard from 'app/components/game-accounts/components/account-card/account-card';
import currentUserTypes from 'app/components/current-user/current-user.types';
import checkLogin from 'tools/check-login';

import { accountData, allAccounts } from 'app/pages/accounts-import/accounts-import.helpers';

import './game-accounts.styl';

const GameAccountsPropertyTypes = {
  className: PropTypes.string,
  currentUser: currentUserTypes.isRequired,
  separatedPageMode: PropTypes.bool,
  dispatch: PropTypes.func.isRequired,
};

const GameAccountsDefaultProperties = {
  className: '',
  separatedPageMode: false,
};

@hot
@prepare()
@connect((state) => ({
  size: state.app.size,
  currentUser: state.currentUser,
}))
class GameAccounts extends React.Component {
  static propTypes = GameAccountsPropertyTypes;

  static defaultProps = GameAccountsDefaultProperties;

  constructor(props) {
    super(props);

    this.state = {};
  }

  render() {
    const { className, currentUser, separatedPageMode, dispatch } = this.props;

    if (!currentUser.id) {
      checkLogin(dispatch, undefined, { useReplace: true });
    }

    const accounts = allAccounts.map((account) => accountData(account, currentUser));
    const somethingAlreadyConnected = accounts.some((account) => account.status === 'ready');

    return (
      <div className={cn('game-accounts', className)}>
        <div className="game-accounts__title">
          <FormattedMessage id="game_accounts.title" />
        </div>
        <p className="game-accounts__text">
          <FormattedMessage id="settings.game_accounts_text" />
        </p>
        <div className="game-accounts__wrap">
          {accounts.map((account) => (
            <AccountCard key={account.slug} account={account} separatedPageMode={separatedPageMode} />
          ))}
        </div>
        {separatedPageMode && (
          <Link className="game-accounts__skip" to={paths.index}>
            <FormattedMessage id={somethingAlreadyConnected ? 'game_accounts.next' : 'game_accounts.skip'} />
          </Link>
        )}
      </div>
    );
  }
}

export default GameAccounts;
