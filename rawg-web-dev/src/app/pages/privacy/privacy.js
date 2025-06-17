/* eslint-disable jsx-a11y/anchor-has-content, jsx-a11y/anchor-is-valid */

import React from 'react';
import { injectIntl } from 'react-intl';
import { connect } from 'react-redux';
import { compose } from 'recompose';

import prepare from 'tools/hocs/prepare';

import Page from 'app/ui/page';
import Content from 'app/ui/content';
import Footer from 'app/ui/footer';
import Markdown from 'app/ui/markdown';

import markdownTextRu from './content/ru';

const hoc = compose(
  prepare(),
  connect((state) => ({
    locale: state.app.locale,
  })),
  injectIntl,
);

const PrivacyComponent = () => {
  return (
    <Page helmet={{ title: 'Политика конфиденциальности' }} className="page_static page_footer" art={false}>
      <Content columns="1">
        <Markdown text={markdownTextRu} />
        <Footer />
      </Content>
    </Page>
  );
};

const Privacy = hoc(PrivacyComponent);
export default Privacy;
