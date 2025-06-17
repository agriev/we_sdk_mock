/* eslint-disable react/no-unused-state */

import React, { Component } from 'react';
import { connect } from 'react-redux';
import { FormattedHTMLMessage } from 'react-intl';
import Markdown from 'app/ui/markdown';

import { hot } from 'react-hot-loader/root';

import prepare from 'tools/hocs/prepare';
import Heading from 'app/ui/heading';

import appHelper from 'app/pages/app/app.helper';
import Page from 'app/ui/page';
import Content from 'app/ui/content';
import './dev.styl';
import { appSizeType } from 'app/pages/app/app.types';

@hot
@prepare()
@connect((state) => ({
  size: state.app.size,
  currentUser: state.currentUser,
}))
export default class Dev extends Component {
  static propTypes = {
    size: appSizeType.isRequired,
  };

  constructor(...data) {
    super(...data);

    this.collectionsSliderRef = React.createRef();
    this.gamesSliderRef = React.createRef();

    this.state = {
      data: '',
      isLoading: true,
    };
  }

  async componentDidMount() {
    try {
      const json = await fetch('https://registry.npmjs.org/@agru/sdk').then((r) => r.json());
      const data = json.readme.slice(json.readme.indexOf('## Установка'));

      this.setState(() => {
        return {
          data,
          isLoading: false,
        };
      });
    } catch (error) {
      console.log(error);
    }
  }

  renderHeader = () => (
    <div className="welcome__block welcome__block_header">
      <Heading className="welcome__title-h1" rank={1}>
        <FormattedHTMLMessage id="dev.title" />
      </Heading>
    </div>
  );

  render() {
    const { size } = this.props;

    if (this.state.isLoading || !this.state.data) {
      return null;
    }

    return (
      <Page
        className="welcome"
        art={{
          height: appHelper.isDesktopSize({ size }) ? '900px' : '620px',
          bottom: true,
          bottomHeight: appHelper.isDesktopSize({ size }) ? '700px' : '500px',
        }}
        helmet={{
          none: true,
        }}
        loader={false}
      >
        <Content className="welcome__content" columns="1">
          {this.renderHeader()}
          <Markdown text={this.state.data} />
        </Content>
      </Page>
    );
  }
}
