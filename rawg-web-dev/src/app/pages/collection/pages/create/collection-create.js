/* eslint-disable camelcase */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { injectIntl } from 'react-intl';
import { parse } from 'qs';

import prepare from 'tools/hocs/prepare';
import checkAuth from 'tools/hocs/check-auth';
import colorHandler from 'tools/color-handler';
import { loadProfile } from 'app/pages/profile/profile.actions';

import Page from 'app/ui/page';
import Content from 'app/ui/content';
import CloseButton from 'app/ui/close-button';

import currentUserType from 'app/components/current-user/current-user.types';

import intlShape from 'tools/prop-types/intl-shape';

import CollectionForm from '../../components/form';

import { createCollection, cleanCollection } from '../../collection.actions';

import '../collection/collection.styl';
import './collection-create.styl';

const componentPropertyTypes = {
  intl: intlShape.isRequired,
  dispatch: PropTypes.func.isRequired,
  profile: PropTypes.shape({
    user: PropTypes.object,
  }).isRequired,
  currentUser: currentUserType.isRequired,
};

const componentDefaultProperties = {};

@prepare()
@checkAuth({ login: true })
@injectIntl
@connect((state) => ({
  profile: state.profile,
  currentUser: state.currentUser,
}))
export default class CollectionCreate extends Component {
  static propTypes = componentPropertyTypes;

  static defaultProps = componentDefaultProperties;

  componentDidMount() {
    const { dispatch, currentUser } = this.props;

    dispatch(cleanCollection());
    dispatch(loadProfile(currentUser.id));
  }

  handleSubmit = ({ title, description, isPrivate }) => {
    const { dispatch } = this.props;

    const gameIdToAdd = parse(window.location.search.substring(1)).addGame;

    return dispatch(createCollection({ title, description, gameIdToAdd, isPrivate }));
  };

  render() {
    const { intl, profile } = this.props;
    const { game_background } = profile.user;

    return (
      <Page
        className="page_secondary collection-create"
        helmet={{
          title: intl.formatMessage({ id: 'collection.head_title_create' }),
          noindex: true,
          // image: profile.share_image,
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
        <Content className="collection-create__content" columns="1">
          <CloseButton className="collection-create__close-button" />
          <CollectionForm onSubmit={this.handleSubmit} />
        </Content>
      </Page>
    );
  }
}
