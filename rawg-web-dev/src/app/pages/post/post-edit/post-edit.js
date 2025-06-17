import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { push } from 'react-router-redux';
import { injectIntl } from 'react-intl';

import prepare from 'tools/hocs/prepare';
import checkAuth from 'tools/hocs/check-auth';

import Page from 'app/ui/page';
import Content from 'app/ui/content';
import CloseButton from 'app/ui/close-button';
import PostForm from 'app/components/post-form';
import { editPost, cleanPost } from 'app/components/post-form/post-form.actions';
import paths from 'config/paths';

import currentUserType from 'app/components/current-user/current-user.types';
import intlShape from 'tools/prop-types/intl-shape';

import { loadPost } from '../post.actions';

import '../post.styl';
import './post-edit.styl';

@prepare(
  async ({ store, params = {} }) => {
    const { id } = params;

    await store.dispatch(cleanPost());
    await store.dispatch(loadPost(id));
  },
  {
    updateParam: 'id',
  },
)
@checkAuth({ login: true })
@injectIntl
@connect((state) => ({
  currentUser: state.currentUser,
  post: state.post,
}))
export default class PostCreate extends Component {
  static propTypes = {
    intl: intlShape.isRequired,
    dispatch: PropTypes.func.isRequired,
    params: PropTypes.shape().isRequired,
    currentUser: currentUserType.isRequired,
    post: PropTypes.shape().isRequired,
  };

  componentDidMount() {
    const { dispatch } = this.props;

    if (!this.isAvailable()) {
      dispatch(push(paths.index));
    }
  }

  handleSubmit = (options) => {
    const {
      dispatch,
      params: { id },
    } = this.props;

    return dispatch(editPost({ id, ...options }));
  };

  isAvailable() {
    const { currentUser, post } = this.props;

    return post.id ? currentUser.id === post.user.id : true;
  }

  render() {
    const { intl, post } = this.props;

    return (
      <Page
        className="page_secondary"
        helmet={{
          title: intl.formatMessage({ id: 'post.head_title_edit' }),
          noindex: true,
        }}
        art={false}
        header={{ display: false }}
      >
        <Content columns="1">
          <CloseButton className="post__close-button" />
          <PostForm post={post} onSubmit={this.handleSubmit} />
        </Content>
      </Page>
    );
  }
}
