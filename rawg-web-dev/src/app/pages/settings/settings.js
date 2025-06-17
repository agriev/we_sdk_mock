import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { injectIntl } from 'react-intl';
import { connect } from 'react-redux';
import { hot } from 'react-hot-loader/root';

import prepare from 'tools/hocs/prepare';
import SimpleIntlMessage from 'app/components/simple-intl-message';

import { loadProfile } from 'app/pages/profile/profile.actions';
import { getBackgroundArt } from 'app/pages/profile/profile.helpers';
import { currentUserIdType } from 'app/components/current-user/current-user.types';
import locationShape from 'tools/prop-types/location-shape';
import intlShape from 'tools/prop-types/intl-shape';

import Heading from 'app/ui/heading';

import Page from 'app/ui/page';
import Content from 'app/ui/content';
import Tabs from 'app/ui/tabs';
import Tab from 'app/ui/tabs/tab';
import paths from 'config/paths';
import './settings.styl';

@hot
@prepare()
@connect((state) => ({
  gameBackground: state.profile.user.game_background,
  currentUserId: state.currentUser.id,
}))
@injectIntl
export default class Settings extends Component {
  static propTypes = {
    intl: intlShape.isRequired,
    location: locationShape.isRequired,
    children: PropTypes.node.isRequired,
    gameBackground: PropTypes.shape(),
    dispatch: PropTypes.func.isRequired,
    currentUserId: currentUserIdType.isRequired,
  };

  static defaultProps = {
    gameBackground: undefined,
  };

  constructor(props, context) {
    super(props, context);

    this.getBackgroundArt = getBackgroundArt();
  }

  componentDidMount() {
    const { currentUserId } = this.props;

    this.props.dispatch(loadProfile(currentUserId));
  }

  isActiveTab(path) {
    return path === this.props.location.pathname;
  }

  render() {
    const { intl, location, gameBackground } = this.props;

    return (
      <Page
        className="settings-page"
        art={this.getBackgroundArt(gameBackground)}
        helmet={{
          title: intl.formatMessage({
            id: `settings.head_title${location.pathname.replace('/settings', '')}`,
          }),
          noindex: true,
        }}
      >
        <Content className="settings" columns="1">
          <Heading className="settings__title" rank={1} looksLike={2}>
            <SimpleIntlMessage id="settings.title" />
          </Heading>
          <Tabs className="settings__tabs" centred={false}>
            <Tab to={paths.settings} active={this.isActiveTab(paths.settings)}>
              <SimpleIntlMessage id="settings.tab_info" />
            </Tab>
            <Tab to={paths.settingsGameAccounts} active={this.isActiveTab(paths.settingsGameAccounts)}>
              <SimpleIntlMessage id="settings.tab_game_accounts" />
            </Tab>
            {/* <Tab to={paths.settingsSocialAccounts} active={this.isActiveTab(paths.settingsSocialAccounts)}> */}
            {/*  <SimpleIntlMessage id="settings.tab_social_accounts" /> */}
            {/* </Tab> */}
            <Tab to={paths.settingsNotifications} active={this.isActiveTab(paths.settingsNotifications)}>
              <SimpleIntlMessage id="settings.tab_notifications" />
            </Tab>
            <Tab to={paths.settingsAdvanced} active={this.isActiveTab(paths.settingsAdvanced)}>
              <SimpleIntlMessage id="settings.tab_advanced" />
            </Tab>
            {/* <Tab to={paths.settingsPassword} active={this.isActiveTab(paths.settingsPassword)}> */}
            {/*  <SimpleIntlMessage id="settings.tab_password" /> */}
            {/* </Tab> */}
            {/* <Tab to={paths.settingsEmail} active={this.isActiveTab(paths.settingsEmail)}> */}
            {/*  <SimpleIntlMessage id="settings.tab_email" /> */}
            {/* </Tab> */}
            <Tab to={paths.settingsExport} active={this.isActiveTab(paths.settingsExport)}>
              <SimpleIntlMessage id="settings.tab_export" />
            </Tab>
          </Tabs>
          <div className="settings__content">{this.props.children}</div>
        </Content>
      </Page>
    );
  }
}
