import React, { Component } from 'react';
import { injectIntl } from 'react-intl';
import { connect } from 'react-redux';

import prepare from 'tools/hocs/prepare';

import { appLocaleType } from 'app/pages/app/app.types';
import intlShape from 'tools/prop-types/intl-shape';

import Page from 'app/ui/page';
import Content from 'app/ui/content';
import Footer from 'app/ui/footer';
import Markdown from 'app/ui/markdown';

import markdownTextEn from './content/en';
import markdownTextRu from './content/ru';

@prepare()
@injectIntl
@connect((state) => ({
  locale: state.app.locale,
}))
export default class PrivacyPolicy extends Component {
  static propTypes = {
    intl: intlShape.isRequired,
    locale: appLocaleType.isRequired,
  };

  render() {
    const { intl, locale } = this.props;
    const markdownText = locale === 'en' ? markdownTextEn : markdownTextRu;

    return (
      <Page
        helmet={{ title: intl.formatMessage({ id: 'terms.head_title' }) }}
        className="page_static page_footer"
        header={{ empty: true }}
        art={false}
      >
        <Content columns="1">
          <Markdown text={markdownText} />
          <Footer />
        </Content>
      </Page>
    );
  }
}
