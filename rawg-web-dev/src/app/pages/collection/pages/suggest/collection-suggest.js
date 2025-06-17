import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { push } from 'react-router-redux';

import prepare from 'tools/hocs/prepare';

import Page from 'app/ui/page';
import Content from 'app/ui/content';
import paths from 'config/paths';
import CollectionSearchGames from '../../components/search-games';
import { addCollectionsSuggestions } from '../../collection.actions';
import './collection-suggest.styl';

@prepare()
@connect((state) => ({
  collection: state.collection,
}))
export default class CollectionSuggest extends Component {
  static propTypes = {
    params: PropTypes.shape().isRequired,
    dispatch: PropTypes.func.isRequired,
  };

  handleAddGamesClick = (games) => {
    const { dispatch, params } = this.props;
    const { id } = params;

    dispatch(addCollectionsSuggestions(id, games)).then(() => {
      this.showCollection();
    });
  };

  showCollection = () => {
    const { dispatch, params } = this.props;
    const { id } = params;

    dispatch(push(paths.collection(id)));
  };

  render() {
    return (
      <Page helmet={{ noindex: true }} art={false} header={{ display: false }}>
        <Content>
          <CollectionSearchGames
            onAddGamesClick={this.handleAddGamesClick}
            onCloseClick={this.showCollection}
            addGameLabelId="recommend_game"
          />
        </Content>
      </Page>
    );
  }
}
