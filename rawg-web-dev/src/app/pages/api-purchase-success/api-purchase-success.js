import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { Link } from 'app/components/link';

import prepare from 'tools/hocs/prepare';

import appHelper from 'app/pages/app/app.helper';
import currentUserType from 'app/components/current-user/current-user.types';
import Page from 'app/ui/page';
import Content from 'app/ui/content';
import Button from 'app/ui/button';
import user from 'app/components/current-user/current-user.helper';

import './api-purchase-success.styl';

@prepare()
@connect((state) => ({
  size: state.app.size,
  currentUser: state.currentUser,
}))
export default class ApiPurchaseSuccessPage extends Component {
  static propTypes = {
    size: PropTypes.string.isRequired,
    currentUser: currentUserType.isRequired,
  };

  render() {
    const { size, currentUser } = this.props;
    const forwardUrl = user.getDeveloperURL(currentUser);
    const forwardLink = <Link to={forwardUrl}>developer profile</Link>;

    return (
      <Page
        className="page_api-purchase-success"
        header={{ display: false }}
        art={{ secondary: true }}
        withSidebar={false}
      >
        <Content columns={appHelper.isDesktopSize({ size }) ? '2-1' : '1'} position="center" fullSize>
          <div key="first">
            <h1>Thank you for purchasing RAWG API!</h1>
            <div className="text">You may go to your {forwardLink} and copy the API key.</div>
            <Link to={forwardUrl}>
              <Button kind="fill" size="medium">
                Get API Key
              </Button>
            </Link>
          </div>
          <div />
        </Content>
      </Page>
    );
  }
}
