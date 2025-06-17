import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { Link } from 'app/components/link';
import { FormattedHTMLMessage, FormattedMessage, injectIntl } from 'react-intl';

import paths from 'config/paths';

import prepare from 'tools/hocs/prepare';
import checkAuth from 'tools/hocs/check-auth';
import SimpleIntlMessage from 'app/components/simple-intl-message/simple-intl-message';

import appHelper from 'app/pages/app/app.helper';
import Page from 'app/ui/page';
import Content from 'app/ui/content';
import { appSizeType, location as appLocationType } from 'app/pages/app/app.types';
import intlShape from 'tools/prop-types/intl-shape';

import SocialAccountsAuthBlock from 'app/components/social-accounts/social-accounts-auth-block';

import RegisterForm from './register-form';

@prepare()
@checkAuth({ login: false })
@injectIntl
@connect((state) => ({
  size: state.app.size,
  savedPageHelmet: state.app.savedPageHelmet,
}))
export default class Register extends Component {
  static propTypes = {
    size: appSizeType.isRequired,
    location: appLocationType.isRequired,
    savedPageHelmet: PropTypes.shape().isRequired,
    intl: intlShape.isRequired,
  };

  renderDesktopLayout = () => (
    <Content columns="1-2" position="center" fullSize>
      <div className="page__form">
        {this.renderTitle()}
        <RegisterForm location={this.props.location} />
        {this.renderAdditional()}
      </div>
      <div className="page__info">
        <div>{this.renderInfo()}</div>
        <div>
          <SocialAccountsAuthBlock location={this.props.location} context="register" />
        </div>
      </div>
    </Content>
  );

  renderMobileLayout = () => (
    <Content columns="1" position="center" fullSize>
      {this.renderTitle()}
      <div className="page__block">{this.renderInfo()}</div>
      <div className="page__block page__block_offset">
        <SocialAccountsAuthBlock location={this.props.location} context="register" />
      </div>
      <div className="page__block">
        <RegisterForm location={this.props.location} />
      </div>
      <div className="page__block">{this.renderAdditional()}</div>
    </Content>
  );

  renderTitle = () => (
    <h2>
      <SimpleIntlMessage id="register.title" />
    </h2>
  );

  renderInfo = () => (
    <h3>
      <FormattedHTMLMessage id="register.info" />
    </h3>
  );

  renderAdditional = () => (
    <div className="page__additional">
      <Link to={paths.login} href={paths.login} rel="nofollow">
        <SimpleIntlMessage id="register.additional" />
      </Link>
    </div>
  );

  render() {
    const {
      size,
      savedPageHelmet,
      intl,
      location: { query },
    } = this.props;

    const messageProperties = {
      id: 'register.agreement',
      values: {
        terms: (
          <Link className="page__footer-link" to={paths.terms} href={paths.terms}>
            <SimpleIntlMessage id="register.terms" />
          </Link>
        ),
        privacyPolicy: (
          <Link className="page__footer-link" to={paths.privacyPolicy} href={paths.privacyPolicy}>
            <SimpleIntlMessage id="register.privacyPolicy" />
          </Link>
        ),
      },
    };

    const customMeta =
      query && query.from === 'rateyourgames'
        ? {
            title: intl.formatMessage({ id: 'profile.rate_games_title' }),
            description: intl.formatMessage({ id: 'profile.rate_games_description' }),
          }
        : {};

    const savedPageTitle =
      savedPageHelmet && savedPageHelmet.title
        ? {
            title: intl.formatMessage({ id: savedPageHelmet.title }),
            description: intl.formatMessage({ id: savedPageHelmet.description }),
          }
        : {};

    return (
      <Page
        className="page_secondary"
        helmet={{ none: true, ...savedPageTitle, ...customMeta }}
        art={{ secondary: true }}
        withSidebar={false}
      >
        {appHelper.isDesktopSize({ size }) ? this.renderDesktopLayout() : this.renderMobileLayout()}
        <Content columns="1" position="center">
          <div className="page__footer-agreement">
            <FormattedMessage {...messageProperties} />
          </div>
        </Content>
      </Page>
    );
  }
}
