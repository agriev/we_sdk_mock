import React, { Component } from 'react';
import { connect } from 'react-redux';
import { push } from 'react-router-redux';
import { hot } from 'react-hot-loader';
import { injectIntl } from 'react-intl';
import PropTypes from 'prop-types';

import denormalizeGame from 'tools/redux/denormalize-game';
import { resetFields } from 'app/pages/game-edit/actions/common';
import { updateGameTagsData, searchTags } from 'app/pages/game-edit/actions/tags';
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
import { fieldTitles } from 'app/pages/game-edit/game-edit.helper';

@hot(module)
@injectIntl
@connect((state) => ({
  game: denormalizeGame(state),
  submitting: state.gameEdit.submitting,
  foundedTags: state.gameEdit.tags.search,
}))
export default class GameEditTags extends Component {
  static propTypes = {
    game: gameType.isRequired,
    submitting: submittingType.isRequired,
    params: PropTypes.shape().isRequired,
    dispatch: PropTypes.func.isRequired,
    foundedTags: PropTypes.shape({
      value: PropTypes.string,
      items: PropTypes.arrayOf(PropTypes.shape({})),
      loading: PropTypes.bool,
    }).isRequired,
  };

  getTagsData = (tags) => tags.map((tag) => tag.name);

  onSaveClick = () => {
    const { dispatch } = this.props;
    sendAnalyticsEdit('save');

    dispatch(updateGameTagsData());
  };

  onCancelClick = () => {
    const { dispatch, game } = this.props;

    dispatch(resetFields());
    dispatch(push(paths.game(game.slug)));
  };

  render() {
    const {
      params: { id },
      game,
      submitting,
      foundedTags,
    } = this.props;

    return (
      <Container title="game_edit.tags" id={id}>
        <ControlGroup title={fieldTitles.tags} withQuestion>
          {({ showHelp }) => (
            <FieldsGroup
              deletedMessageId="game_edit.field_status_group_remove"
              showHelp={showHelp}
              helpText={trans('game_edit.field_tags_desc')}
            >
              <Field>
                <SelectItems
                  name="tags"
                  placeholder={trans('game_edit.field_tags_add')}
                  addText={trans('game_edit.field_tags_add')}
                  title1={trans('game_edit.field_tags_title')}
                  title2={game.name}
                  desc={trans('game_edit.field_tags_modal_desc')}
                  availableItems={this.getTagsData(foundedTags.items)}
                  availableItemsLoading={foundedTags.loading}
                  alreadyAddedTitle={trans('game_edit.field_tags_already_added')}
                  searchAvailableItems={searchTags}
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
