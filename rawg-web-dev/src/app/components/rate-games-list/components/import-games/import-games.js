import React, { Component } from 'react';
import PropTypes from 'prop-types';
import noop from 'lodash/noop';

import trans from 'tools/trans';

import { accountData } from 'app/pages/accounts-import/accounts-import.helpers';

import AccountCard from 'app/components/game-accounts/components/account-card/account-card';

import currentUserType from 'app/components/current-user/current-user.types';

import { setCloseImportPage, resetCloseImportPage, addHidingStore } from './import-games.helper';

const propTypes = {
  className: PropTypes.string,
  store: PropTypes.string.isRequired,
  currentUser: currentUserType.isRequired,
  hideCard: PropTypes.func,
  onSuccessfullConnect: PropTypes.func,
};

const defaultProps = {
  className: undefined,
  hideCard: noop,
  onSuccessfullConnect: noop,
};

class ImportGames extends Component {
  static propTypes = propTypes;

  static defaultProps = defaultProps;

  constructor(props) {
    super(props);

    this.timerId = null;
  }

  componentWillUnmount() {
    resetCloseImportPage(this.props.store);
  }

  onConnect = () => {
    const { store } = this.props;

    if (!this.timerId) {
      setCloseImportPage(store);

      // this.timerId = setInterval(() => {
      //   if (false) {
      //     resetCloseImportPage(store);
      //   }
      // }, 300);
    }
  };

  getHideButtonHandler = () => {
    const { store, hideCard } = this.props;

    return () => {
      addHidingStore(store);
      hideCard(store);
    };
  };

  render() {
    const { currentUser, store, className } = this.props;
    const data = accountData(store, currentUser);

    return (
      <AccountCard
        className={className}
        key={store}
        account={data}
        onConnect={this.onConnect}
        kind="large"
        heading={trans('game_accounts.import_heading', { store: data.name })}
        description={trans('game_accounts.import_description')}
        openInNewTab
        hideButtonHandler={this.getHideButtonHandler()}
        onSuccessfullConnect={this.props.onSuccessfullConnect}
      />
    );
  }
}

export default ImportGames;
