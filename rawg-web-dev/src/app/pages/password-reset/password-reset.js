import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { FormattedHTMLMessage } from 'react-intl';

import prepare from 'tools/hocs/prepare';
import SimpleIntlMessage from 'app/components/simple-intl-message/simple-intl-message';

import appHelper from 'app/pages/app/app.helper';
import Page from 'app/ui/page';
import Content from 'app/ui/content';
import { appSizeType } from 'app/pages/app/app.types';
import PasswordResetForm from './password-reset-form';

@prepare()
@connect((state) => ({
  size: state.app.size,
}))
export default class PasswordReset extends Component {
  static propTypes = {
    size: appSizeType.isRequired,
    params: PropTypes.shape().isRequired,
  };

  renderDesktopLayout = () => (
    <Content columns="1-2" position="center" fullSize>
      <div className="page__form">
        {this.renderTitle()}
        {this.renderForm()}
      </div>
      <div className="page__info">
        <div>{this.renderInfo()}</div>
      </div>
    </Content>
  );

  renderMobileLayout = () => (
    <Content columns="1" position="center" fullSize>
      {this.renderTitle()}
      <div className="page__block">{this.renderInfo()}</div>
      <div className="page__block">{this.renderForm()}</div>
    </Content>
  );

  renderTitle = () => (
    <h2>
      <SimpleIntlMessage id="password_reset.title" />
    </h2>
  );

  renderInfo = () => (
    <h3>
      <FormattedHTMLMessage id="password_reset.info" />
    </h3>
  );

  renderForm = () => <PasswordResetForm params={this.props.params} />;

  render = () => (
    <Page withSidebar={false} className="page_secondary" art={{ secondary: true }}>
      {appHelper.isDesktopSize({ size: this.props.size }) ? this.renderDesktopLayout() : this.renderMobileLayout()}
    </Page>
  );
}
