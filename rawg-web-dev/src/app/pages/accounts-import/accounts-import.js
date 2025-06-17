import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { compose } from 'recompose';
import { hot } from 'react-hot-loader';
import { connect } from 'react-redux';
import cn from 'classnames';
import { push } from 'react-router-redux';

import './accounts-import.styl';

import isPlainObject from 'lodash/isPlainObject';

import prepare from 'tools/hocs/prepare';
import paths from 'config/paths';

import SimpleIntlMessage from 'app/components/simple-intl-message/simple-intl-message';
import VideoHelper from 'app/pages/accounts-import/components/video-helper/video-helper';
import CloseButton from 'app/ui/close-button';
import ImportForm from 'app/pages/accounts-import/components/import-form';
import ImportSteam from 'app/pages/accounts-import/components/import-steam';

import { appSizeType } from 'app/pages/app/app.types';
import currentUserType from 'app/components/current-user/current-user.types';
import locationShape from 'tools/prop-types/location-shape';

import checkLogin from 'tools/check-login';

import { setImportStarted } from 'app/components/rate-games-list/components/import-games/import-games.helper';

import { NOTIF_STATUS_SUCCESS } from 'app/pages/app/components/notifications/notifications.actions';

import { accountData, helpersData } from 'app/pages/accounts-import/accounts-import.helpers';

const hoc = compose(
  hot(module),
  prepare(),
  connect((state) => ({
    size: state.app.size,
    currentUser: state.currentUser,
  })),
);

const componentPropertyTypes = {
  className: PropTypes.string,
  size: appSizeType.isRequired,
  params: PropTypes.shape({
    account: PropTypes.string.isRequired,
  }).isRequired,
  location: locationShape.isRequired,
  currentUser: currentUserType.isRequired,
  dispatch: PropTypes.func.isRequired,
};

const defaultProps = {
  className: '',
};

class AccountsImportComponent extends Component {
  componentDidMount() {
    const { currentUser, dispatch } = this.props;

    if (!currentUser.id) {
      checkLogin(dispatch, undefined, { useReplace: true });
    }
  }

  componentDidUpdate(previousProperties) {
    const previousState = accountData(previousProperties.params.account, previousProperties.currentUser);
    const currentState = accountData(this.props.params.account, this.props.currentUser);
    const { location } = this.props;
    const closeAfterSuccess = location.query.closeAfterSuccess === 'true';

    if (closeAfterSuccess && previousState.status !== 'process' && currentState.status === 'process') {
      setImportStarted(this.props.params.account);
      setTimeout(window.close, 500);
    }
  }

  selectBackRoute = () => {
    const { location, dispatch } = this.props;
    const { state } = location;

    if (isPlainObject(state) && state.separatedPageMode) {
      return dispatch(push(paths.gameAccounts));
    }

    return dispatch(push(paths.settingsGameAccounts));
  };

  close = () => {
    this.selectBackRoute();
  };

  render() {
    const {
      size,
      params: { account },
      className,
      currentUser,
    } = this.props;

    if (!currentUser.id) return null;

    const { name, slug, icon, id, status, accountID } = accountData(account, currentUser);

    if (status === NOTIF_STATUS_SUCCESS) {
      this.selectBackRoute();
    }

    return (
      <div className={cn('accounts-import', className)}>
        <div className="accounts-import__title-wrap">
          <SimpleIntlMessage className="accounts-import__title-connect" id="game_accounts.connect_your" />
          <SimpleIntlMessage className="accounts-import__title" id="game_accounts.connect" values={{ account: name }} />
        </div>
        <div className="accounts-import__text">
          <SimpleIntlMessage id="settings.game_accounts_text" />
        </div>
        {account === 'steam' ? (
          <ImportSteam steamId={id} status={status} />
        ) : (
          <ImportForm
            status={status}
            account={account}
            name={name}
            slug={slug}
            icon={icon}
            accountId={accountID}
            id={id}
          />
        )}
        {helpersData(account).map((movieInfo) => (
          <VideoHelper
            key={movieInfo.external_id}
            className="accounts-import__video"
            size={size}
            videoId={movieInfo.external_id}
            thumbnails={movieInfo.thumbnails}
            messages={movieInfo.messages}
          />
        ))}
        <CloseButton className="accounts-import__close" onClick={this.close} />
      </div>
    );
  }
}

const AccountsImport = hoc(AccountsImportComponent);

AccountsImportComponent.propTypes = componentPropertyTypes;
AccountsImportComponent.defaultProps = defaultProps;

export default AccountsImport;
