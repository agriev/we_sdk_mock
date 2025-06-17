import React from 'react';
import { compose } from 'recompose';

import prepare from 'tools/hocs/prepare';

import Page from 'app/ui/page';
import Content from 'app/ui/content';
import Footer from 'app/ui/footer';
import Markdown from 'app/ui/markdown';

import markdownText from './content.js';
import './giveaway-rules.styl';

const hoc = compose(prepare());

const GiveawayRulesComponent = () => {
  return (
    <Page
      helmet={{ title: 'Розыгрыш 200.000 бонусных монет AGold' }}
      className="page_static page_footer giveaway-rules"
      art={false}
    >
      <Content columns="1">
        <Markdown text={markdownText} />
        <Footer />
      </Content>
    </Page>
  );
};

const GiveawayRules = hoc(GiveawayRulesComponent);
export default GiveawayRules;
