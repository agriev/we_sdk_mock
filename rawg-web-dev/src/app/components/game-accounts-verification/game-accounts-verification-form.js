/* eslint-disable camelcase, react/prop-types */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { FormattedMessage, FormattedHTMLMessage } from 'react-intl';
import { Link } from 'app/components/link';
import SVGInline from 'react-svg-inline';
import cn from 'classnames';
import memoizeOne from 'memoize-one';

import { appLocaleType } from 'app/pages/app/app.types';

import currentUserType from 'app/components/current-user/current-user.types';

import paths from 'config/paths';
import appHelper from 'app/pages/app/app.helper';
import copyTextToClipboard from 'tools/copy-to-clipboard';

import steamIcon from 'assets/icons/stores/steam.svg';
import psStoreIcon from 'assets/icons/stores/ps-store.svg';
import xboxIcon from 'assets/icons/stores/xbox.svg';
import Button from 'app/ui/button';
import helpIcon from 'assets/icons/help.svg';
import copyIcon from 'assets/icons/copy.svg';
import Loading from 'app/ui/loading/loading';
import verifiedIcon from 'assets/icons/raptr-success.svg';

import { getVerificationCode } from './game-accounts-verification.funcs';

import './game-accounts-verification-form.styl';

@connect((state) => ({
  size: state.app.size,
  appLocale: state.app.locale,
  currentUser: state.currentUser,
  registeredFromTokensPage: state.app.registeredFromTokensPage,
}))
export default class GameAccountsVerificationForm extends Component {
  static propTypes = {
    size: PropTypes.string.isRequired,
    appLocale: appLocaleType.isRequired,
    registeredFromTokensPage: PropTypes.bool.isRequired,
    currentUser: currentUserType.isRequired,
    separatedPageMode: PropTypes.bool,
    activeInputName: PropTypes.string,
    setActiveInputName: PropTypes.func.isRequired,
    hasConfirmedAccounts: PropTypes.func.isRequired,
    verifyGameAccounts: PropTypes.func.isRequired,
    finishVerifying: PropTypes.func.isRequired,
    verifying: PropTypes.bool.isRequired,
    verifyResult: PropTypes.shape({
      steam_id: PropTypes.shape({
        confirmed: PropTypes.bool,
        error: PropTypes.string,
      }),
      gamer_tag: PropTypes.shape({
        confirmed: PropTypes.bool,
        error: PropTypes.string,
      }),
      psn_online_id: PropTypes.shape({
        confirmed: PropTypes.bool,
        error: PropTypes.string,
      }),
    }).isRequired,
  };

  static defaultProps = {
    separatedPageMode: false,
    activeInputName: undefined,
  };

  constructor(props) {
    super(props);

    const { currentUser, appLocale } = this.props;

    this.state = {
      verificationCode: getVerificationCode(currentUser, appLocale),
      copied: false,
    };
  }

  componentDidUpdate(prevProperties) {
    if (this.props.size !== prevProperties.size) {
      this.props.setActiveInputName(undefined);
    }
  }

  onClickOnSteamHelpIcon = () => {
    this.onClickOnIcon('steam');
  };

  onClickOnPsnHelpIcon = () => {
    this.onClickOnIcon('psn');
  };

  onClickOnXboxHelpIcon = () => {
    this.onClickOnIcon('xbox');
  };

  onClickOnIcon = (name) => {
    if (this.props.activeInputName === name) {
      this.props.setActiveInputName(undefined);
    } else {
      this.props.setActiveInputName(name);
    }
  };

  /* eslint-disable-next-line react/sort-comp */
  verificationUnavailable = memoizeOne((result, user) => {
    const accounts = ['steam_id', 'gamer_tag', 'psn_online_id'];
    const connectedAccounts = accounts.filter((item) => !!user[item]);
    const isConfirmed = (item) => result[item].confirmed === true || user[`${item}_confirm`] === true;

    return connectedAccounts.every(isConfirmed);
  });

  copyVerificationCode = () => {
    copyTextToClipboard(this.state.verificationCode);

    this.setState({ copied: true });
    setTimeout(() => this.setState({ copied: false }), 150);
  };

  inputs = {
    psn: 'psn_online_id',
    steam: 'steam_id',
    xbox: 'gamer_tag_id',
  };

  statusBlock = ({ confirmed, error }, confirmedFlag, id, verifying) => {
    const { size } = this.props;
    const confirmedIconSize = appHelper.isDesktopSize({ size }) ? '24px' : '16px';

    if (!id) {
      return (
        <div className="game-accounts-verification-form__message game-accounts-verification-form__message_inactive">
          <FormattedMessage id="game_accounts_verification.not-linked" />
        </div>
      );
    }

    if (verifying) {
      return (
        <div className="game-accounts-verification-form__message game-accounts-verification-form__message_process">
          <Loading size="small" />
        </div>
      );
    }

    if (confirmed || confirmedFlag) {
      return (
        <div className="game-accounts-verification-form__message game-accounts-verification-form__message_success">
          <SVGInline width={confirmedIconSize} height={confirmedIconSize} svg={verifiedIcon} />
          <FormattedMessage id="game_accounts_verification.verified" />
        </div>
      );
    }

    if (error) {
      return (
        <div className="game-accounts-verification-form__message game-accounts-verification-form__message_error">
          {error}
        </div>
      );
    }

    return (
      <div className="game-accounts-verification-form__message">
        <FormattedMessage id="game_accounts_verification.awaiting" />
      </div>
    );
  };

  render() {
    const {
      currentUser,
      separatedPageMode,
      activeInputName,
      verifying,
      verifyResult,
      registeredFromTokensPage,
    } = this.props;
    const { copied } = this.state;

    const {
      steam_id,
      gamer_tag,
      psn_online_id,

      steam_id_confirm,
      gamer_tag_confirm,
      psn_online_id_confirm,
      // has_confirmed_accounts,
    } = currentUser;

    const skipUrl = registeredFromTokensPage ? paths.tokensDashboard : paths.profile(currentUser.slug);

    const formItemClass = 'game-accounts-verification-form__item';

    return (
      <div className="game-accounts-verification-form">
        {separatedPageMode && (
          <h2 className="game-accounts-verification-form__header">
            <FormattedMessage id="game_accounts_verification.title" />
          </h2>
        )}
        <div className="game-accounts-verification-form__top-text">
          <FormattedHTMLMessage id="game_accounts_verification.desc" />
        </div>

        <div className="game-accounts-verification__verification-link-container">
          <div className="game-accounts-verification__verification-link-title">
            <FormattedHTMLMessage id="game_accounts_verification.verification_link" />
          </div>
          <div
            className={cn('game-accounts-verification__verification-link-subcontainer', {
              copied,
            })}
            onClick={this.copyVerificationCode}
            role="button"
            tabIndex={0}
          >
            <div className="game-accounts-verification__verification-link">{this.state.verificationCode}</div>
            <SVGInline svg={copyIcon} />
          </div>
        </div>

        <div className="game-accounts-verification-form__items">
          <div
            className={cn(formItemClass, {
              active: activeInputName === 'steam',
            })}
          >
            <div className="game-accounts-verification-form__label">
              Steam
              <SVGInline width="24px" height="24px" svg={steamIcon} />
            </div>
            <div className="game-accounts-verification-form__field">
              {this.statusBlock(verifyResult.steam_id, steam_id_confirm, steam_id, verifying)}
            </div>
            <SVGInline
              className="game-accounts-verification-form__help-icon"
              width="16px"
              height="16px"
              svg={helpIcon}
              onClick={this.onClickOnSteamHelpIcon}
            />
          </div>

          <div
            className={cn(formItemClass, {
              active: activeInputName === 'psn',
            })}
          >
            <div className="game-accounts-verification-form__label">
              PlayStation Network
              <SVGInline width="30px" height="24px" svg={psStoreIcon} />
            </div>
            <div className="game-accounts-verification-form__field">
              {this.statusBlock(verifyResult.psn_online_id, psn_online_id_confirm, psn_online_id, verifying)}
            </div>
            <SVGInline
              className="game-accounts-verification-form__help-icon"
              width="16px"
              height="16px"
              svg={helpIcon}
              onClick={this.onClickOnPsnHelpIcon}
            />
          </div>

          <div
            className={cn(formItemClass, {
              active: activeInputName === 'xbox',
            })}
          >
            <div className="game-accounts-verification-form__label">
              Xbox Live
              <SVGInline width="24px" height="24px" svg={xboxIcon} />
            </div>
            <div className="game-accounts-verification-form__field">
              {this.statusBlock(verifyResult.gamer_tag, gamer_tag_confirm, gamer_tag, verifying)}
            </div>
            <SVGInline
              className="game-accounts-verification-form__help-icon"
              width="16px"
              height="16px"
              svg={helpIcon}
              onClick={this.onClickOnXboxHelpIcon}
            />
          </div>
        </div>

        <Button
          className="game-accounts-verification-form__check-button"
          onClick={this.props.verifyGameAccounts}
          kind="fill"
          size="medium"
          loading={verifying}
          disabled={verifying || this.verificationUnavailable(verifyResult, currentUser)}
        >
          <FormattedMessage id="game_accounts_verification.check_all" />
        </Button>

        <div className="game-accounts-verification-form__submit-container">
          {separatedPageMode && [
            <Button
              key="done-btn"
              className="game-accounts-verification-form__submit-button"
              kind="fill"
              size="medium"
              onClick={this.props.finishVerifying}
              disabled={!this.props.hasConfirmedAccounts}
            >
              <FormattedMessage id="game_accounts_verification.done" />
            </Button>,
            <Link key="skip-btn" className="game-accounts-verification-form__skip-link" to={skipUrl} href={skipUrl}>
              <FormattedMessage id="game_accounts.skip" />
            </Link>,
          ]}
        </div>
      </div>
    );
  }
}
