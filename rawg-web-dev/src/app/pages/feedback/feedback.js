import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { injectIntl } from 'react-intl';

import prepare from 'tools/hocs/prepare';
import intlShape from 'tools/prop-types/intl-shape';

import appHelper from 'app/pages/app/app.helper';
import Page from 'app/ui/page';
import Content from 'app/ui/content';
import Footer from 'app/ui/footer';

import FeedbackForm from './feedback-form';

@prepare()
@injectIntl
@connect((state) => ({
  size: state.app.size,
}))
export default class Feedback extends Component {
  static propTypes = {
    intl: intlShape.isRequired,
    size: PropTypes.string.isRequired,
  };

  static defaultProps = {};

  renderDesktopLayout = () => (
    <Content columns="1-2" fullSize>
      <div className="page__form">
        <FeedbackForm />
      </div>
    </Content>
  );

  renderMobileLayout = () => (
    <Content columns="1" fullSize>
      <div className="page__block">
        <FeedbackForm />
      </div>
    </Content>
  );

  render() {
    const { intl, size } = this.props;

    return (
      <Page
        helmet={{ title: intl.formatMessage({ id: 'feedback.head_title' }) }}
        className="page_secondary page_footer"
        art={{ secondary: true }}
      >
        {appHelper.isDesktopSize({ size }) ? this.renderDesktopLayout() : this.renderMobileLayout()}
        <Footer />
      </Page>
    );
  }
}
