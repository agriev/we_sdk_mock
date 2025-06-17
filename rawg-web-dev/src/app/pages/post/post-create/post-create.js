import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { injectIntl } from 'react-intl';

import Error404 from 'interfaces/error-404';

import prepare from 'tools/hocs/prepare';
import checkAuth from 'tools/hocs/check-auth';
import decodeURIComponentSafe from 'tools/decode-uri-component-safe';

import locationShape from 'tools/prop-types/location-shape';

import Page from 'app/ui/page';
import Content from 'app/ui/content';
import CloseButton from 'app/ui/close-button';
import PostForm from 'app/components/post-form';
import { createPost } from 'app/components/post-form/post-form.actions';

import '../post.styl';
import './post-create.styl';

import intlShape from 'tools/prop-types/intl-shape';

@prepare(async ({ location: { query } }) => {
  const { game } = query;

  if (!game) {
    throw new Error404();
  }
})
@checkAuth({ login: true })
@injectIntl
@connect((state) => ({
  currentUser: state.currentUser,
  post: state.post,
}))
export default class PostCreate extends Component {
  static propTypes = {
    dispatch: PropTypes.func.isRequired,
    intl: intlShape.isRequired,
    location: locationShape.isRequired,
    post: PropTypes.shape().isRequired,
  };

  handleSubmit = (options) => {
    const { dispatch } = this.props;

    return dispatch(createPost(options));
  };

  render() {
    const {
      intl,
      location: { query },
      post,
    } = this.props;
    const { loading } = post;

    return (
      <Page
        className="page_secondary"
        helmet={{
          title: intl.formatMessage({ id: 'post.head_title_create' }),
          noindex: true,
        }}
        art={false}
        header={{ display: false }}
      >
        <Content columns="1">
          <CloseButton className="post__close-button" />
          <PostForm
            post={{ game: JSON.parse(decodeURIComponentSafe(query.game)), loading }}
            onSubmit={this.handleSubmit}
            clean
          />
        </Content>
      </Page>
    );
  }
}
