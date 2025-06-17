/* eslint-disable jsx-a11y/anchor-has-content, jsx-a11y/anchor-is-valid */

import React from 'react';
import { injectIntl } from 'react-intl';
import { compose } from 'recompose';
import { hot } from 'react-hot-loader/root';

import prepare from 'tools/hocs/prepare';

import Page from 'app/ui/page';
import Content from 'app/ui/content';
import Footer from 'app/ui/footer';
import Markdown from 'app/ui/markdown';

import checkLocale from 'tools/hocs/check-locale';
import intlShape from 'tools/prop-types/intl-shape';

import markdownText from './content/text';

import './ag-welcome-back.styl';

import backgroundArt from '../apidocs/assets/bg.jpg';

const hoc = compose(
  hot,
  prepare(),
  checkLocale('ru'),
  injectIntl,
);

const componentPropertyTypes = {
  intl: intlShape.isRequired,
};

const PrivacyPolicyComponent = ({ intl }) => (
  <Page
    helmet={{ title: intl.formatMessage({ id: 'shared.ag_welcome_back_title' }) }}
    className="page_static page_footer page-welcome-back"
    art={{
      size: 'desktop',
      image: {
        path: backgroundArt,
        color: '#0f0f0f',
      },
      height: '450px',
      colored: true,
    }}
  >
    <Content className="welcome-back" columns="1">
      <Markdown text={markdownText} />
      <Footer />
    </Content>
  </Page>
);

PrivacyPolicyComponent.propTypes = componentPropertyTypes;

const PrivacyPolicy = hoc(PrivacyPolicyComponent);

export default PrivacyPolicy;
