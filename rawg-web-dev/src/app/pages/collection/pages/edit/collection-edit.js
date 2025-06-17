/* eslint-disable camelcase */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { push } from 'react-router-redux';
import { injectIntl } from 'react-intl';

import paths from 'config/paths';

import prepare from 'tools/hocs/prepare';
import colorHandler from 'tools/color-handler';
import intlShape from 'tools/prop-types/intl-shape';

import Page from 'app/ui/page';
import Content from 'app/ui/content';
import CloseButton from 'app/ui/close-button';

import { currentUserIdType } from 'app/components/current-user/current-user.types';

import CollectionForm from '../../components/form';
import { loadCollection, editCollection } from '../../collection.actions';

import '../collection/collection.styl';
import './collection-edit.styl';

@prepare(
  async ({ store, params = {} }) => {
    const { id } = params;

    await Promise.all([store.dispatch(loadCollection(id))]);
  },
  {
    updateParam: 'id',
  },
)
@injectIntl
@connect((state) => ({
  profile: state.profile,
  currentUserId: state.currentUser.id,
  collection: state.collection,
}))
export default class CollectionEdit extends Component {
  static propTypes = {
    collection: PropTypes.shape().isRequired,
    dispatch: PropTypes.func.isRequired,
    currentUserId: currentUserIdType.isRequired,
    intl: intlShape.isRequired,
    profile: PropTypes.shape({
      user: PropTypes.object,
    }).isRequired,
  };

  componentDidMount() {
    const { dispatch } = this.props;

    if (!this.isAvailable()) {
      dispatch(push(paths.index));
    }
  }

  handleSubmit = ({ title, description, isPrivate }) => {
    const { dispatch, collection } = this.props;
    const { id } = collection;

    return dispatch(editCollection({ id, title, description, isPrivate }));
  };

  isAvailable() {
    const { currentUserId, collection } = this.props;

    return collection.id ? currentUserId === collection.creator.id : true;
  }

  render() {
    if (!this.isAvailable()) return null;

    const { intl, collection, profile } = this.props;
    const { user } = profile;
    const { game_background, share_image } = user;

    return (
      <Page
        className="page_secondary collection-edit"
        helmet={{
          title: intl.formatMessage({ id: 'collection.head_title_edit' }, { name: collection.name }),
          noindex: true,
          image: share_image,
        }}
        art={{
          height: '450px',
          image: {
            path: game_background ? game_background.url : undefined,
            color: game_background
              ? `rgba(${colorHandler.hexToRgb(game_background.dominant_color).join(',')},0.8)`
              : '',
          },
        }}
        header={{ display: false }}
      >
        <Content className="collection-edit__content" columns="1">
          <CloseButton className="collection__close-button" />
          <CollectionForm collection={collection} onSubmit={this.handleSubmit} isEdit showRemoveButton />
        </Content>
      </Page>
    );
  }
}
