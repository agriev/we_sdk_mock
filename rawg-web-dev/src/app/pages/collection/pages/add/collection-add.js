import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { push } from 'react-router-redux';

import prepare from 'tools/hocs/prepare';
import colorHandler from 'tools/color-handler';

import Page from 'app/ui/page';
import Content from 'app/ui/content';
import paths from 'config/paths';
import CollectionSearchGames from '../../components/search-games';
import { addCollectionGames } from '../../collection.actions';

import './collection-add.styl';

@prepare()
@connect((state) => ({
  profile: state.profile,
}))
export default class CollectionAdd extends Component {
  static propTypes = {
    dispatch: PropTypes.func.isRequired,
    params: PropTypes.shape().isRequired,
    profile: PropTypes.shape().isRequired,
  };

  handleAddGamesClick = (games) => {
    const { dispatch, params } = this.props;
    const { id } = params;

    dispatch(addCollectionGames(id, games)).then(() => {
      this.showCollection();
    });
  };

  showCollection = () => {
    const { dispatch, params } = this.props;
    const { id } = params;

    dispatch(push(paths.collection(id)));
  };

  render() {
    const { profile } = this.props;

    return (
      <Page
        helmet={{ noindex: true, image: profile.user.share_image }}
        art={{
          height: '450px',
          image: profile.user.game_background
            ? {
                path: profile.user.game_background.url,
                color: `rgba(${colorHandler.hexToRgb(profile.user.game_background.dominant_color).join(',')},0.8)`,
              }
            : null,
        }}
        header={{ display: false }}
      >
        <Content>
          <CollectionSearchGames
            onAddGamesClick={this.handleAddGamesClick}
            onCloseClick={this.showCollection}
            addGameLabelId="add_game"
          />
        </Content>
      </Page>
    );
  }
}
