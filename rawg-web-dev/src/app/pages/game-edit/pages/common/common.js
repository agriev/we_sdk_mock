import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import { sendAnalyticsEdit } from 'scripts/analytics-helper';

import checkAuth from 'tools/hocs/check-auth';
import prepare from 'tools/hocs/prepare';
import paths from 'config/paths';

import './common.styl';

import { getESRBRatings } from 'app/pages/app/app.actions';
import { loadGame, resetGameState } from 'app/pages/game/game.actions';

import gameEditTypes from 'app/pages/game-edit/game-edit.types';
import checkLocale from 'tools/hocs/check-locale';
import { fillEditGameData, resetFields, resetAll } from 'app/pages/game-edit/actions/common';
import { fillEditGameStores } from 'app/pages/game-edit/actions/stores';
import { fillEditGameTags } from 'app/pages/game-edit/actions/tags';

@prepare(
  async ({ store, params = {} }) => {
    const { id } = params;

    const promises = [id && store.dispatch(loadGame(id, paths.gameEditBasic)), store.dispatch(getESRBRatings())];

    if (id) {
      const [game] = await Promise.all(promises);

      if (game) {
        store.dispatch(fillEditGameData(game));
        store.dispatch(fillEditGameStores(game.stores));
        store.dispatch(fillEditGameTags(game.tags));
        store.dispatch(resetFields());
      }
    } else {
      store.dispatch(resetAll());
      store.dispatch(resetGameState());
      await Promise.all(promises);
    }
  },
  {
    updateParam: 'id',
  },
)
@checkAuth({ login: true })
@checkLocale('en')
@connect((state) => ({
  gameEdit: state.gameEdit,
}))
export default class Common extends Component {
  static propTypes = {
    children: PropTypes.node.isRequired,
    gameEdit: gameEditTypes.isRequired,
  };

  componentDidMount() {
    sendAnalyticsEdit('open');
  }

  getSnapshotBeforeUpdate(previousProperties) {
    if (!previousProperties.gameEdit.wasEdited && this.props.gameEdit.wasEdited) {
      sendAnalyticsEdit('edit');
    }

    return null;
  }

  render() {
    return <div className="game-edit">{this.props.children}</div>;
  }
}
