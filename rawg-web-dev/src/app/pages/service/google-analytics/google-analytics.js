import React from 'react';
// import PropTypes from 'prop-types';
import { hot } from 'react-hot-loader';
import cn from 'classnames';
import { connect } from 'react-redux';
import cookies from 'browser-cookies';

import './google-analytics.styl';

import prepare from 'tools/hocs/prepare';

import Page from 'app/ui/page/page';
import Content from 'app/ui/content/content';
import Heading from 'app/ui/heading/heading';
import ToggleButton from 'app/ui/toggle-button/toggle-button';
import { analyticsEnabled } from 'scripts/analytics-helper';

@hot(module)
@prepare()
@connect()
class ServiceGA extends React.Component {
  static propTypes = {};

  static defaultProps = {};

  constructor(props, context) {
    super(props, context);

    this.state = {
      isClient: false,
    };
  }

  componentDidMount() {
    this.setState({ isClient: true });
  }

  toggleAnalytics = () => {
    const isStaffFlagActive = cookies.get('is_staff');
    const newState = isStaffFlagActive === 'true' ? 'false' : 'true';

    cookies.set('is_staff', newState, { expires: 365 });

    if (cookies.get('is_staff') !== 'true') {
      // eslint-disable-next-line no-self-assign
      window.location = window.location;
    }

    this.forceUpdate();
  };

  render() {
    const { isClient } = this.state;

    if (!isClient) {
      return null;
    }

    const enabled = analyticsEnabled();

    return (
      <Page
        helmet={{
          title: 'Service / Google Analytics',
        }}
      >
        <Content columns="1">
          <div className="service-ga">
            <Heading rank={1}>Google Analytics Settings</Heading>

            <div className={cn('service-ga__checkbox', { enabled })}>
              <ToggleButton
                enabled={enabled}
                onChange={this.toggleAnalytics}
                text={`Analytics is ${enabled ? 'enabled' : 'disabled'} for you`}
              />
            </div>
          </div>
        </Content>
      </Page>
    );
  }
}

export default ServiceGA;
