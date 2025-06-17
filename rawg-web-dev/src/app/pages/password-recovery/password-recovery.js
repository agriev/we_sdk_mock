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
import PasswordRecoveryForm from './password-recovery-form';

@prepare()
@connect((state) => ({
  size: state.app.size,
  form: state.form.passwordRecovery,
}))
export default class PasswordRecovery extends Component {
  static propTypes = {
    size: appSizeType.isRequired,
    form: PropTypes.shape().isRequired,
  };

  renderDesktopLayout = () => (
    <Content columns="1-2" position="center" fullSize>
      <div className="page__form">
        {this.renderTitle()}
        <PasswordRecoveryForm />
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
      <div className="page__block">
        <PasswordRecoveryForm />
      </div>
    </Content>
  );

  renderTitle = () => (
    <h2>
      <SimpleIntlMessage id="password_recovery.title" />
    </h2>
  );

  renderInfo = () => {
    const { form = {} } = this.props;
    const { submitSucceeded } = form;

    return (
      <h3>
        <FormattedHTMLMessage id={submitSucceeded ? 'password_recovery.info_success' : 'password_recovery.info'} />
      </h3>
    );
  };

  render = () => (
    <Page className="page_secondary" art={{ secondary: true }} helmet={{ none: true }} withSidebar={false}>
      {appHelper.isDesktopSize({ size: this.props.size }) ? this.renderDesktopLayout() : this.renderMobileLayout()}
    </Page>
  );
}
