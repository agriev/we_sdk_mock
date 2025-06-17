import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { push } from 'react-router-redux';

import prepare from 'tools/hocs/prepare';

import paths from 'config/paths';
import { confirmEmail } from './confirm-email.actions';

const componentPropertyTypes = {
  dispatch: PropTypes.func.isRequired,
};

@prepare(async ({ store, params }) => {
  const { token } = params;

  await store.dispatch(confirmEmail(token));
})
@connect()
export default class ConfirmEmail extends React.Component {
  static propTypes = componentPropertyTypes;

  componentDidMount() {
    const { dispatch } = this.props;

    dispatch(push(paths.index));
  }

  render() {
    return null;
  }
}
