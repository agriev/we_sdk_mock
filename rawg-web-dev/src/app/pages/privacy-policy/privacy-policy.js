/* eslint-disable jsx-a11y/anchor-has-content, jsx-a11y/anchor-is-valid */

import React from 'react';
import PropTypes from 'prop-types';
import { injectIntl } from 'react-intl';
import { connect } from 'react-redux';
import { compose } from 'recompose';

import prepare from 'tools/hocs/prepare';

import Page from 'app/ui/page';
import Content from 'app/ui/content';
import Footer from 'app/ui/footer';
import Markdown from 'app/ui/markdown';

import intlShape from 'tools/prop-types/intl-shape';

import markdownTextEn from './content/en';
import markdownTextRu from './content/ru';

const hoc = compose(
  prepare(),
  connect((state) => ({
    locale: state.app.locale,
  })),
  injectIntl,
);

const componentPropertyTypes = {
  intl: intlShape.isRequired,
  locale: PropTypes.string.isRequired,
};

const PrivacyPolicyComponent = ({ intl, locale }) => {
  const markdownText = locale === 'en' ? markdownTextEn : markdownTextRu;

  return (
    <Page helmet={{ title: 'Лицензионное соглашение' }} className="page_static page_footer" art={false}>
      <Content columns="1">
        <Markdown text={markdownText} />
        <Footer />
      </Content>
    </Page>
  );
};

PrivacyPolicyComponent.propTypes = componentPropertyTypes;

const PrivacyPolicy = hoc(PrivacyPolicyComponent);

export default PrivacyPolicy;
