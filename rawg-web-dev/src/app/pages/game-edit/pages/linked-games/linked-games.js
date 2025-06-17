import React, { Component } from 'react';
import { connect } from 'react-redux';
import { push } from 'react-router-redux';
import { hot } from 'react-hot-loader';
import { injectIntl } from 'react-intl';
import PropTypes from 'prop-types';

import differenceBy from 'lodash/differenceBy';

import propEq from 'ramda/src/propEq';

import denormalizeGame from 'tools/redux/denormalize-game';
import {
  resetFields,
  getPropertiesOfSuccessNotification,
  getPropertiesOfErrorNotification,
} from 'app/pages/game-edit/actions/common';
import paths from 'config/paths';
import trans from 'tools/trans';
import { sendAnalyticsEdit } from 'scripts/analytics-helper';

import Container from 'app/pages/game-edit/components/container';
import ControlGroup from 'app/pages/game-edit/components/control-group';
import FieldsGroup from 'app/pages/game-edit/components/fields-group';
import Field from 'app/pages/game-edit/components/field';
import SelectItems from 'app/pages/game-edit/components/select-items';
import MainBtns from 'app/pages/game-edit/components/main-btns';

import gameType from 'app/pages/game/game.types';
import { submittingType } from 'app/pages/game-edit/game-edit.types';
import currentUserType from 'app/components/current-user/current-user.types';

import { loadAllGameAdditions, updateGameAdditionsData } from 'app/pages/game-edit/actions/additions';
import { loadAllGameSeries, updateGameGameSeriesData } from 'app/pages/game-edit/actions/game-series';
import { findAllGames } from 'app/pages/search/search.actions';
import denormalizeArray from 'tools/redux/denormalize-array';
import { GAME_EDIT_SUBMIT_START, GAME_EDIT_SUBMIT_FINISH } from 'app/pages/game-edit/actions/basic';

import itemsHelper, { ItemsTypes } from 'app/pages/game-edit/components/added-items/added-items.helper';
import { addNotification } from 'app/pages/app/components/notifications/notifications.actions';
import { fieldTitles } from 'app/pages/game-edit/game-edit.helper';

@hot(module)
@injectIntl
@connect((state) => ({
  game: denormalizeGame(state),
  submitting: state.gameEdit.submitting,
  currentUser: state.currentUser,
  foundedGames: denormalizeArray(state, 'search.allGames.results', 'GAME_ARRAY'),
  foundedGamesData: state.search.allGames,
  currentAdditions: state.gameEdit.additions.current,
  changedAdditions: state.gameEdit.additions.changed,
}))
export default class GameEditLinkedGames extends Component {
  static propTypes = {
    game: gameType.isRequired,
    currentUser: currentUserType.isRequired,
    submitting: submittingType.isRequired,
    params: PropTypes.shape().isRequired,
    foundedGames: PropTypes.arrayOf(PropTypes.object).isRequired,
    foundedGamesData: PropTypes.shape({
      loading: PropTypes.bool,
    }).isRequired,
    dispatch: PropTypes.func.isRequired,
    currentAdditions: PropTypes.arrayOf(PropTypes.object).isRequired,
    changedAdditions: PropTypes.arrayOf(PropTypes.object).isRequired,
  };

  componentDidMount() {
    const { dispatch, game } = this.props;

    dispatch(loadAllGameAdditions(game.slug));
    dispatch(loadAllGameSeries(game.slug));
  }

  onSaveClick = async () => {
    const { dispatch } = this.props;
    sendAnalyticsEdit('save');

    dispatch({ type: GAME_EDIT_SUBMIT_START });

    await Promise.all([dispatch(updateGameAdditionsData()), dispatch(updateGameGameSeriesData())])
      .then(() => {
        dispatch(addNotification(getPropertiesOfSuccessNotification()));
      })
      .catch((error) => {
        dispatch(addNotification(getPropertiesOfErrorNotification(error)));
      });

    dispatch({ type: GAME_EDIT_SUBMIT_FINISH });
  };

  onCancelClick = () => {
    const { dispatch, game } = this.props;

    dispatch(resetFields());
    dispatch(push(paths.game(game.slug)));
  };

  isNotEditor = () => {
    const { currentUser } = this.props;

    return !currentUser.is_editor;
  };

  searchForGameSeries = (query) => {
    return findAllGames(query, 1, {
      excludeAdditions: true,
    });
  };

  getAvailableItemsForGameSeries = () => {
    const { currentAdditions, changedAdditions, foundedGames } = this.props;

    const addedItems = itemsHelper.getAddedItems({
      type: ItemsTypes.OBJECT,
      currentValues: currentAdditions,
      changedValues: changedAdditions,
    });

    return differenceBy(foundedGames, addedItems, 'id');
  };

  render() {
    const { params, game, submitting, foundedGames, foundedGamesData } = this.props;
    const { id } = params;

    return (
      <Container title="game_edit.linked-games" id={id}>
        {game.parents_count <= 0 && (
          <ControlGroup title={fieldTitles.additions} withQuestion>
            {({ showHelp }) => (
              <FieldsGroup
                deletedMessageId="game_edit.field_status_group_remove"
                showHelp={showHelp}
                helpText={trans('game_edit.field_additions_desc')}
              >
                <Field>
                  <SelectItems
                    name="additions"
                    placeholder={trans('game_edit.field_additions_placeholder')}
                    addText={trans('game_edit.field_additions_add')}
                    title1={trans('game_edit.field_additions_title')}
                    title2={game.name}
                    desc={trans('game_edit.field_additions_modal_desc')}
                    availableItems={foundedGames}
                    availableItemsLoading={foundedGamesData.loading}
                    alreadyAddedTitle={trans('game_edit.field_additions_already_added')}
                    forbidEditCurrentItems={this.isNotEditor()}
                    searchAvailableItems={findAllGames}
                    disableSelected={propEq('slug', game.slug)}
                  />
                </Field>
              </FieldsGroup>
            )}
          </ControlGroup>
        )}
        <ControlGroup title="game_edit.field_game_series" withQuestion>
          {({ showHelp }) => (
            <FieldsGroup
              deletedMessageId="game_edit.field_status_group_remove"
              showHelp={showHelp}
              helpText={trans('game_edit.field_game_series_desc')}
            >
              <Field>
                <SelectItems
                  name="gameSeries"
                  placeholder={trans('game_edit.field_game_series_placeholder')}
                  addText={trans('game_edit.field_game_series_add')}
                  title1={trans('game_edit.field_game_series_title')}
                  title2={game.name}
                  desc={trans('game_edit.field_game_series_modal_desc')}
                  availableItems={this.getAvailableItemsForGameSeries()}
                  availableItemsLoading={foundedGamesData.loading}
                  alreadyAddedTitle={trans('game_edit.field_game_series_already_added')}
                  forbidEditCurrentItems={this.isNotEditor()}
                  searchAvailableItems={this.searchForGameSeries}
                  disableSelected={propEq('slug', game.slug)}
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
