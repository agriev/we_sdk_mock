import React, { Component } from 'react';
import { ReactReduxContext } from 'react-redux';
import { replace } from 'react-router-redux';

import paths from 'config/paths';

import { setPrivatePage } from 'app/pages/app/app.actions';
import checkLogin from 'tools/check-login';
import user from 'app/components/current-user/current-user.helper';

export const AUTH_FORWARD_DEVELOPER = 'developer';

export default function checkAuth({ login, redirectToLogin, path, helmet, appendQuery }) {
  return (decoratedComponent) =>
    class CheckAuthComponentDecorator extends Component {
      static contextType = ReactReduxContext;

      constructor(props, context) {
        super(props, context);

        const { store } = this.context;

        store.dispatch(setPrivatePage(true));
        store.dispatch(checkLogin);
      }

      componentWillUnmount() {
        const { store } = this.context;

        store.dispatch(setPrivatePage(false));
      }

      isRedirect() {
        const { store } = this.context;
        const {
          currentUser: { id },
        } = store.getState();

        return login ? !id : !!id;
      }

      render() {
        return this.isRedirect() ? null : React.createElement(decoratedComponent, this.props);
      }
    };
}
