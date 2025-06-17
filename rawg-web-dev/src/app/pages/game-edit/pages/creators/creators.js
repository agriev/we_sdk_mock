import React, { Component } from 'react';
import { connect } from 'react-redux';
import { push } from 'react-router-redux';
import { hot } from 'react-hot-loader';
import { injectIntl } from 'react-intl';
import PropTypes from 'prop-types';
import SVGInline from 'react-svg-inline';

import pathSatisfies from 'ramda/src/pathSatisfies';
import propSatisfies from 'ramda/src/propSatisfies';
import reject from 'ramda/src/reject';
import includes from 'ramda/src/includes';
import equals from 'ramda/src/equals';
import __ from 'ramda/src/__';

import denormalizeGame from 'tools/redux/denormalize-game';

import paths from 'config/paths';
import trans from 'tools/trans';
import { sendAnalyticsEdit } from 'scripts/analytics-helper';

import importantIcon from 'assets/icons/important.svg';

import {
  updateGameCreatorsData,
  searchCreators,
  loadAllGameCreators,
  loadCreatorsPositions,
} from 'app/pages/game-edit/actions/creators';

import Container from 'app/pages/game-edit/components/container';
import ControlGroup from 'app/pages/game-edit/components/control-group';
import FieldsGroup from 'app/pages/game-edit/components/fields-group';
import Field from 'app/pages/game-edit/components/field';
import MainBtns from 'app/pages/game-edit/components/main-btns';

import gameType from 'app/pages/game/game.types';
import { submittingType } from 'app/pages/game-edit/game-edit.types';
import { resetFields } from 'app/pages/game-edit/actions/common';
import SelectCreators from 'app/pages/game-edit/components/select-creators/select-creators';
import addedItemsHelper from 'app/pages/game-edit/components/added-items/added-items.helper';
import idProp from 'tools/id';
import intlShape from 'tools/prop-types/intl-shape';
import { fieldTitles } from 'app/pages/game-edit/game-edit.helper';

@hot(module)
@injectIntl
@connect((state) => ({
  game: denormalizeGame(state),
  submitting: state.gameEdit.submitting,
  foundedCreators: state.gameEdit.creators.search,
  currentValues: state.gameEdit.creators.current,
  changedValues: state.gameEdit.creators.changed,
  deletedValues: state.gameEdit.creators.deleted,
}))
export default class GameEditCreators extends Component {
  static propTypes = {
    game: gameType.isRequired,
    submitting: submittingType.isRequired,
    params: PropTypes.shape().isRequired,
    dispatch: PropTypes.func.isRequired,
    intl: intlShape.isRequired,
    foundedCreators: PropTypes.shape({
      value: PropTypes.string,
      items: PropTypes.arrayOf(PropTypes.shape({})),
      loading: PropTypes.bool,
    }).isRequired,
    currentValues: PropTypes.arrayOf(PropTypes.object),
    changedValues: PropTypes.arrayOf(PropTypes.object),
    deletedValues: PropTypes.arrayOf(PropTypes.number),
  };

  componentDidMount() {
    const { dispatch, game } = this.props;

    dispatch(loadAllGameCreators(game.slug));
    dispatch(loadCreatorsPositions());
  }

  onSaveClick = () => {
    const { dispatch } = this.props;
    sendAnalyticsEdit('save');

    dispatch(updateGameCreatorsData());
  };

  onCancelClick = () => {
    const { dispatch, game } = this.props;

    dispatch(resetFields());
    dispatch(push(paths.game(game.slug)));
  };

  getErrorMessage = () => {
    const { intl, currentValues, changedValues, deletedValues } = this.props;
    const withoutDeleted = reject(propSatisfies(includes(__, deletedValues), 'id'));
    const items = withoutDeleted(addedItemsHelper.getObjectsUnion(currentValues, changedValues));

    if (items.some(pathSatisfies(equals(0), ['positions', 'length']))) {
      return intl.formatMessage(idProp('game_edit.field_creators_error_should_have_positions'));
    }

    return null;
  };

  render() {
    const { params, game, submitting, foundedCreators } = this.props;
    const { id } = params;
    const errorMessage = this.getErrorMessage();

    return (
      <Container title="game_edit.creators" id={id}>
        <ControlGroup title={fieldTitles.creators} withQuestion>
          {({ showHelp }) => (
            <FieldsGroup
              deletedMessageId="game_edit.field_status_group_remove"
              helpText={trans('game_edit.field_creators_desc')}
              showHelp={showHelp}
            >
              <Field>
                <SelectCreators
                  name="creators"
                  placeholder={trans('game_edit.field_creators_add')}
                  addText={trans('game_edit.field_creators_add')}
                  title1={trans('game_edit.field_creators_title')}
                  title2={game.name}
                  desc={trans('game_edit.field_creators_modal_desc')}
                  selectedDesc={(creator) =>
                    trans('game_edit.field_creators_modal_desc_selected', { creator: creator.name })
                  }
                  availableItems={foundedCreators.items}
                  availableItemsLoading={foundedCreators.loading}
                  alreadyAddedTitle={trans('game_edit.field_creators_already_added')}
                  searchAvailableItems={searchCreators}
                />
              </Field>
            </FieldsGroup>
          )}
        </ControlGroup>
        <ControlGroup
          className="game-edit__main-btns"
          beforeContent={
            errorMessage && (
              <div className="game-edit__error-message">
                <SVGInline svg={importantIcon} /> {errorMessage}
              </div>
            )
          }
        >
          <MainBtns
            submitting={submitting}
            onSave={this.onSaveClick}
            onCancel={this.onCancelClick}
            saveDisabled={!!errorMessage}
          />
        </ControlGroup>
      </Container>
    );
  }
}
