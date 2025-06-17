import React, { Component } from 'react';
import { connect } from 'react-redux';
import { push } from 'react-router-redux';
import { hot } from 'react-hot-loader';
import { injectIntl } from 'react-intl';
import PropTypes from 'prop-types';

import denormalizeGame from 'tools/redux/denormalize-game';
import { resetFields } from 'app/pages/game-edit/actions/common';
import { updateGameStoresData } from 'app/pages/game-edit/actions/stores';
import paths from 'config/paths';
import trans from 'tools/trans';
import { sendAnalyticsEdit } from 'scripts/analytics-helper';

import Container from 'app/pages/game-edit/components/container';
import ControlGroup from 'app/pages/game-edit/components/control-group';
import FieldsGroup from 'app/pages/game-edit/components/fields-group';
import Field from 'app/pages/game-edit/components/field';
import ExtendedStringItems from 'app/pages/game-edit/components/extended-string-items';
import MainBtns from 'app/pages/game-edit/components/main-btns';

import gameType from 'app/pages/game/game.types';
import { submittingType } from 'app/pages/game-edit/game-edit.types';
import { stores as storesType } from 'app/pages/games/games.types';
import currentUserType from 'app/components/current-user/current-user.types';
import { fieldTitles } from 'app/pages/game-edit/game-edit.helper';

@hot(module)
@injectIntl
@connect((state) => ({
  game: denormalizeGame(state),
  submitting: state.gameEdit.submitting,
  allStores: state.app.stores,
  currentUser: state.currentUser,
}))
export default class GameEditStores extends Component {
  static propTypes = {
    game: gameType.isRequired,
    currentUser: currentUserType.isRequired,
    submitting: submittingType.isRequired,
    params: PropTypes.shape().isRequired,
    allStores: storesType.isRequired,
    dispatch: PropTypes.func.isRequired,
  };

  onSaveClick = () => {
    const { dispatch } = this.props;
    sendAnalyticsEdit('save');

    dispatch(updateGameStoresData());
  };

  onCancelClick = () => {
    const { dispatch, game } = this.props;

    dispatch(resetFields());
    dispatch(push(paths.game(game.slug)));
  };

  getStoresEnum(stores) {
    return stores
      .sort((a, b) => {
        if (a.name.toLowerCase() > b.name.toLowerCase()) {
          return 1;
        }

        if (a.name.toLowerCase() < b.name.toLowerCase()) {
          return -1;
        }

        return 0;
      })
      .reduce((res, store, index) => {
        switch (index) {
          case 0:
            return `${store.name}`;

          case stores.length - 1:
            return `${res} and ${store.name}`;

          default:
            return `${res}, ${store.name}`;
        }
      }, '');
  }

  isNotEditor = () => {
    const { currentUser } = this.props;

    return !currentUser.is_editor;
  };

  render() {
    const {
      params: { id },
      game,
      submitting,
      allStores,
    } = this.props;

    const stores = this.getStoresEnum(allStores);

    return (
      <Container title="game_edit.stores" id={id}>
        <ControlGroup title={fieldTitles.stores} withQuestion>
          {({ showHelp }) => (
            <FieldsGroup
              deletedMessageId="game_edit.field_status_group_remove"
              showHelp={showHelp}
              helpText={trans('game_edit.field_stores_desc')}
            >
              <Field>
                <ExtendedStringItems
                  name="stores"
                  placeholder={trans('game_edit.field_stores_add')}
                  addText={trans('game_edit.field_stores_add')}
                  title1={trans('game_edit.field_stores_title')}
                  title2={game.name}
                  desc={trans('game_edit.field_stores_modal_desc', { stores })}
                  availableItems={allStores}
                  alreadyAddedTitle={trans('game_edit.field_stores_already_added')}
                  forbidEditCurrentItems={this.isNotEditor()}
                />
              </Field>
            </FieldsGroup>
          )}
        </ControlGroup>
        <ControlGroup className="game-edit__main-btns">
          <MainBtns submitting={submitting} onSave={this.onSaveClick} onCancel={this.onCancelClick} />
        </ControlGroup>
      </Container>
    );
  }
}
