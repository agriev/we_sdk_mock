import React from 'react';
import PropTypes from 'prop-types';
import { hot } from 'react-hot-loader';
import SVGInline from 'react-svg-inline';
import { browserHistory } from 'react-router';
import cn from 'classnames';

import './account-card.styl';

import isNull from 'lodash/isNull';
import noop from 'lodash/noop';

import {
  isImportStarted,
  resetImportStarted,
} from 'app/components/rate-games-list/components/import-games/import-games.helper';

import trans from 'tools/trans';
import paths from 'config/paths';
import ConnectButton from 'app/components/game-accounts/components/connect-button/connect-button';

import StatusBlock from '../status-block';

const componentPropertyTypes = {
  className: PropTypes.string,
  account: PropTypes.shape({
    name: PropTypes.string.isRequired,
    slug: PropTypes.string.isRequired,
    icon: PropTypes.node.isRequired,
    accountID: PropTypes.string,
    status: PropTypes.string,
  }).isRequired,
  separatedPageMode: PropTypes.bool,
  kind: PropTypes.oneOf(['default', 'large']),
  heading: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
  description: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
  openInNewTab: PropTypes.bool,
  hideButtonHandler: PropTypes.func,
  onSuccessfullConnect: PropTypes.func,
};

const defaultProps = {
  className: '',
  separatedPageMode: false,
  kind: 'default',
  heading: undefined,
  description: undefined,
  openInNewTab: false,
  hideButtonHandler: undefined,
  onSuccessfullConnect: noop,
};

@hot(module)
class AccountCard extends React.Component {
  static propTypes = componentPropertyTypes;

  static defaultProps = defaultProps;

  checkConnectionIntervalId = null;

  componentWillUnmount() {
    if (this.checkConnectionIntervalId) {
      clearInterval(this.checkConnectionIntervalId);
    }
  }

  onConnectClick = () => {
    const { account, separatedPageMode, openInNewTab } = this.props;
    const { slug } = account;

    if (openInNewTab) {
      window.open(`${paths.accountsImport(slug)}?closeAfterSuccess=true`, '_blank');

      if (isNull(this.checkConnectionIntervalId)) {
        this.checkConnectionIntervalId = setInterval(this.checkConnectionStatus, 300);
      }
    } else {
      browserHistory.push({
        pathname: paths.accountsImport(slug),
        state: {
          separatedPageMode,
        },
      });
    }
  };

  checkConnectionStatus = () => {
    const { account } = this.props;
    const { slug } = account;

    if (isImportStarted(slug)) {
      clearInterval(this.checkConnectionIntervalId);
      resetImportStarted(slug);
      this.checkConnectionIntervalId = null;

      this.props.onSuccessfullConnect(slug);
    }
  };

  render() {
    const {
      className,
      account: { name, icon, status, slug, accountID },
      kind,
      heading,
      description,
      hideButtonHandler,
    } = this.props;

    const isConnected = status === 'ready';

    const isError =
      status === 'error' || status === 'private-user' || status === 'private-games' || status === 'unavailable';

    const cardClassName = cn('account-card', `account-card_${kind}`, `account-card_${slug}`, className);

    return (
      <div className={cardClassName}>
        <SVGInline svg={icon} className={cn('account-card__icon', `account-card__icon_${slug}`)} />
        <div className="account-card__name">{heading || name}</div>
        {description ? (
          <div className="account-card__description">{description}</div>
        ) : (
          <StatusBlock status={status} name={name} slug={slug} />
        )}
        <ConnectButton
          isError={isError}
          accountId={accountID}
          isConnected={isConnected}
          onClick={this.onConnectClick}
        />
        {hideButtonHandler && (
          <div className="account-card__hide-button">
            <span onClick={hideButtonHandler} role="button" tabIndex="0">
              {trans('rate_games.hide_import')}
            </span>
          </div>
        )}
        {isConnected && <div className="account-card__connected" />}
        {isError && <div className={cn('account-card__connected', 'account-card__error')} />}
      </div>
    );
  }
}

export default AccountCard;
