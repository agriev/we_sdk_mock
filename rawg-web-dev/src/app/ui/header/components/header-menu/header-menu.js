import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { withRouter } from 'react-router';

import { appSizeType, appLocaleType } from 'app/pages/app/app.types';
import locationShape from 'tools/prop-types/location-shape';

import appHelper from 'app/pages/app/app.helper';
import Dropdown from 'app/ui/dropdown';
import currentUserType from 'app/components/current-user/current-user.types';
import { logout } from 'app/components/current-user/current-user.actions';
import MenuButton from './components/menu-button';
import HeaderMenuPhone from './header-menu-phone';
import HeaderMenuDesktop from './header-menu-desktop';

import './header-menu.styl';
import './header-menu-phone.styl';

export const userNameMaxLength = 10;

export const headerMenuPropTypes = {
  dispatch: PropTypes.func.isRequired,
  size: appSizeType.isRequired,
  locale: appLocaleType.isRequired,
  currentUser: currentUserType.isRequired,
  location: locationShape.isRequired,
};

@connect((state) => ({
  size: state.app.size,
  locale: state.app.locale,
  currentUser: state.currentUser,
}))
@withRouter
export default class HeaderMenu extends Component {
  static propTypes = headerMenuPropTypes;

  constructor(props, context) {
    super(props, context);

    this.state = {
      opened: false,
    };
  }

  componentDidUpdate(previousProperties) {
    const previousPathname = previousProperties.location.pathname;
    const currentPathname = this.props.location.pathname;

    if (previousPathname !== currentPathname) {
      this.handleClose();
    }
  }

  handleClose = () => {
    this.setState({ opened: false });
  };

  handleOpen = () => {
    this.setState({ opened: true });
  };

  handleLogout = () => {
    this.props.dispatch(logout());
    this.handleClose();
  };

  renderContent = () => {
    const { size, currentUser, locale } = this.props;
    const commonMenuProperties = {
      size,
      currentUser,
      locale,
      handleLogout: this.handleLogout,
    };

    return (
      <div className="header-menu-content">
        {appHelper.isDesktopSize({ size }) ? (
          <HeaderMenuDesktop {...commonMenuProperties} />
        ) : (
          <HeaderMenuPhone {...commonMenuProperties} handleClose={this.handleClose} />
        )}
      </div>
    );
  };

  render() {
    const { opened } = this.state;
    const { size, currentUser } = this.props;

    return (
      <div className="header-menu">
        <Dropdown
          isMouseOver={appHelper.isDesktopSize({ size })}
          renderedButton={<MenuButton size={size} currentUser={currentUser} />}
          renderedContent={this.renderContent()}
          opened={opened}
          onOpen={this.handleOpen}
          kind="menu"
          containerClassName="header-menu-dropdown-container"
          alwaysRenderContent
          debug
        />
      </div>
    );
  }
}
