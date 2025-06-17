import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { Link } from 'app/components/link';
import { FormattedMessage, FormattedHTMLMessage } from 'react-intl';

import prepare from 'tools/hocs/prepare';

import appHelper from 'app/pages/app/app.helper';
import { setStatus } from 'app/pages/app/app.actions';
import Page from 'app/ui/page';
import Content from 'app/ui/content';
import Button from 'app/ui/button';
import { appSizeType } from 'app/pages/app/app.types';
import paths from 'config/paths';

@prepare()
@connect((state) => ({
  size: state.app.size,
}))
export default class InternalServerError extends Component {
  static propTypes = {
    size: appSizeType.isRequired,
    dispatch: PropTypes.func.isRequired,
  };

  componentWillUnmount() {
    const { dispatch } = this.props;

    dispatch(setStatus(200));
  }

  render = () => (
    <Page className="page_error" header={{ display: false }} art={{ secondary: true }} withSidebar={false}>
      <Content columns={appHelper.isDesktopSize({ size: this.props.size }) ? '1-2' : '1'} position="center" fullSize>
        <div>
          <h1>500</h1>
          <div className="text">
            <FormattedHTMLMessage id="internal_server_error.text" />
          </div>
          <Link to={paths.index}>
            <Button kind="fill" size="medium">
              <FormattedMessage id="internal_server_error.link" />
            </Button>
          </Link>
        </div>
        <div />
      </Content>
    </Page>
  );
}
