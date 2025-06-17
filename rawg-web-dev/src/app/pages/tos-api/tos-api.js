/* eslint-disable jsx-a11y/anchor-has-content, jsx-a11y/anchor-is-valid */

import React from 'react';
import { injectIntl } from 'react-intl';
import { compose } from 'recompose';

import prepare from 'tools/hocs/prepare';

import Page from 'app/ui/page';
import Content from 'app/ui/content';
import Footer from 'app/ui/footer';
import Markdown from 'app/ui/markdown';

import intlShape from 'tools/prop-types/intl-shape';

import markdownTextEn from './content/en';

const hoc = compose(
  prepare(),
  injectIntl,
);

const componentPropertyTypes = {
  intl: intlShape.isRequired,
};

const TermsOfServiceComponent = ({ intl }) => {
  return (
    <Page
      helmet={{ title: intl.formatMessage({ id: 'tos_api.title' }) }}
      className="page_static page_footer"
      art={false}
    >
      <Content columns="1">
        <Markdown text={markdownTextEn} />
        <Footer />
      </Content>
    </Page>
  );
};

TermsOfServiceComponent.propTypes = componentPropertyTypes;

const TermsOfService = hoc(TermsOfServiceComponent);

export default TermsOfService;
