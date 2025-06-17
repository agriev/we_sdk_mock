import React, { Component } from 'react';
import { connect } from 'react-redux';
import { Link } from 'app/components/link';
import { FormattedHTMLMessage } from 'react-intl';
import { hot } from 'react-hot-loader/root';

import paths from 'config/paths';
import prepare from 'tools/hocs/prepare';
import checkAuth from 'tools/hocs/check-auth';
import SimpleIntlMessage from 'app/components/simple-intl-message';

import './login.styl';

import appHelper from 'app/pages/app/app.helper';
import Page from 'app/ui/page';
import Content from 'app/ui/content';
import { appSizeType, appLocaleType } from 'app/pages/app/app.types';
import locationShape from 'tools/prop-types/location-shape';

import SocialAccountsAuthBlock from 'app/components/social-accounts/social-accounts-auth-block';
import LoginForm from './login-form';

@hot
@prepare()
@checkAuth({ login: false })
@connect((state) => ({
  size: state.app.size,
  locale: state.app.locale,
}))
export default class Login extends Component {
  static propTypes = {
    size: appSizeType.isRequired,
    locale: appLocaleType.isRequired,
    location: locationShape.isRequired,
  };

  renderDesktopLayout = () => (
    <Content columns="1-2" position="center" fullSize>
      <div className="page__form">
        {this.renderTitle()}
        <LoginForm location={this.props.location} />
        {this.renderAdditional()}
      </div>
      <div className="page__info">
        <div>{this.renderInfo()}</div>
        <div>
          <SocialAccountsAuthBlock location={this.props.location} context="login" />
        </div>
      </div>
    </Content>
  );

  renderMobileLayout = () => (
    <Content columns="1" position="center" fullSize>
      {this.renderTitle()}
      <div className="page__block">{this.renderInfo()}</div>
      <div className="page__block page__block_offset">
        <SocialAccountsAuthBlock location={this.props.location} context="login" />
      </div>
      <div className="page__block">
        <LoginForm location={this.props.location} />
      </div>
      <div className="page__block">{this.renderAdditional()}</div>
    </Content>
  );

  renderTitle = () => (
    <>
      <h2 className="login__heading">
        <SimpleIntlMessage id="login.title" />
      </h2>
      {this.props.locale === 'ru' && (
        <p className="login__subtitle">
          <SimpleIntlMessage id="login.can_login_through_rawg_creds" />
        </p>
      )}
    </>
  );

  renderInfo = () => (
    <h3>
      <FormattedHTMLMessage id="login.info" />
    </h3>
  );

  renderAdditional = () => (
    <div className="page__additional">
      <Link to={paths.register} href={paths.register} rel="nofollow">
        <SimpleIntlMessage id="login.additional" />
      </Link>
      <Link to={paths.passwordRecovery} href={paths.passwordRecovery} rel="nofollow">
        <FormattedHTMLMessage id="login.forgot" />
      </Link>
    </div>
  );

  render = () => (
    <Page withSidebar={false} className="page_secondary" art={{ secondary: true }} helmet={{ none: true }}>
      {appHelper.isDesktopSize({ size: this.props.size }) ? this.renderDesktopLayout() : this.renderMobileLayout()}
    </Page>
  );
}
