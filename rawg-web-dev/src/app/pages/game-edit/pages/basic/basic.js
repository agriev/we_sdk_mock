/* eslint-disable jsx-a11y/no-noninteractive-element-to-interactive-role */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { hot } from 'react-hot-loader';
import { injectIntl } from 'react-intl';
import { push } from 'react-router-redux';

import gameType from 'app/pages/game/game.types';
import currentUserType from 'app/components/current-user/current-user.types';
import { resetFields } from 'app/pages/game-edit/actions/common';

import intlShape from 'tools/prop-types/intl-shape';

import denormalizeGame from 'tools/redux/denormalize-game';
import Container from 'app/pages/game-edit/components/container';
import ControlGroup from 'app/pages/game-edit/components/control-group';
import FieldsGroup from 'app/pages/game-edit/components/fields-group';
import Field from 'app/pages/game-edit/components/field';
import Input from 'app/pages/game-edit/components/input';
import CoverImage from 'app/pages/game-edit/components/cover-image';
import Textarea from 'app/pages/game-edit/components/textarea';
import Date from 'app/pages/game-edit/components/date';
import ESRBRating from 'app/pages/game-edit/components/esrb-rating';
import Metacritic from 'app/pages/game-edit/components/metacritic';
import StringItems from 'app/pages/game-edit/components/string-items';
import SelectItems from 'app/pages/game-edit/components/select-items';
import MainBtns from 'app/pages/game-edit/components/main-btns';
import {
  platforms as platformsType,
  genres as genresType,
  publishers as publishersType,
  developers as developersType,
} from 'app/pages/app/app.types';
import gameEditTypes, { submittingType } from 'app/pages/game-edit/game-edit.types';
import { getPublishers, getDevelopers } from 'app/pages/app/app.actions';
import trans from 'tools/trans';
import paths from 'config/paths';
import { updateGameInfo } from 'app/pages/game-edit/actions/basic';
import { fieldTitles } from 'app/pages/game-edit/game-edit.helper';

@hot(module)
@injectIntl
@connect((state) => ({
  game: denormalizeGame(state),
  currentUser: state.currentUser,
  allPlatforms: state.app.platforms,
  allGenres: state.app.genres,
  allPublishers: state.app.publishers,
  allDevelopers: state.app.developers,
  submitting: state.gameEdit.submitting,
  gameEdit: state.gameEdit,
}))
export default class GameEditBasic extends Component {
  static propTypes = {
    game: gameType.isRequired,
    currentUser: currentUserType.isRequired,
    allPlatforms: platformsType.isRequired,
    allGenres: genresType.isRequired,
    allPublishers: publishersType.isRequired,
    allDevelopers: developersType.isRequired,
    submitting: submittingType.isRequired,
    dispatch: PropTypes.func.isRequired,
    gameEdit: gameEditTypes.isRequired,
    params: PropTypes.shape().isRequired,
    intl: intlShape.isRequired,
  };

  onSaveClick = () => {
    const { dispatch } = this.props;

    dispatch(updateGameInfo());
  };

  onCancelClick = () => {
    const { dispatch, game } = this.props;

    dispatch(resetFields());
    dispatch(push(game.slug ? paths.game(game.slug) : paths.index));
  };

  isNotEditor() {
    const { currentUser } = this.props;

    return !currentUser.is_editor;
  }

  render() {
    const {
      game,
      allPlatforms,
      allGenres,
      allPublishers,
      allDevelopers,
      submitting,
      gameEdit,
      params,
      intl,
    } = this.props;

    const { id } = params;

    const { errors, platforms, genres, publishers, alternative_names: alternativeNames, developers } = gameEdit;

    return (
      <Container title={id ? 'game_edit.basic' : 'game_edit.create_game'} id={id}>
        <ControlGroup title="game_edit.group_general" withQuestion>
          {({ showHelp }) => (
            <>
              <FieldsGroup showHelp={showHelp} helpText={trans('game_edit.field_name_help')} errors={errors.name}>
                <Field title={fieldTitles.name} important={!!id} required={!id}>
                  <Input
                    readOnly={id && this.isNotEditor()}
                    name="name"
                    placeholder="game_edit.field_name_placeholder"
                    changedMessageId="game_edit.field_status_title"
                  />
                </Field>
              </FieldsGroup>
              <FieldsGroup
                showHelp={showHelp}
                helpText={trans('game_edit.field_cover_image_help')}
                errors={errors.image}
              >
                <Field title={fieldTitles.image} important={!!id}>
                  <CoverImage
                    readOnly={id && this.isNotEditor()}
                    addText={trans('game_edit.field_cover_image_add')}
                    changeText={trans('game_edit.field_cover_image_replace')}
                    placeholder={trans('game_edit.field_cover_image_placeholder')}
                  />
                </Field>
              </FieldsGroup>
              <FieldsGroup
                deleted={alternativeNames.deleted}
                group="alt_names"
                showHelp={showHelp}
                helpText={trans('game_edit.field_alternative_names_desc')}
              >
                <Field title={fieldTitles.alternative_names}>
                  <StringItems
                    name="alternative_names"
                    placeholder={trans('game_edit.field_alternative_names_placeholder')}
                    addText={trans('game_edit.field_alternative_names_add')}
                    changeText={trans('game_edit.field_alternative_names_change')}
                    title1={trans('game_edit.field_alternative_names_title')}
                    title2={game.name}
                    desc={trans('game_edit.field_alternative_names_desc')}
                    alreadyAddedTitle={trans('game_edit.field_alternative_names_already_added')}
                  />
                </Field>
              </FieldsGroup>
              <FieldsGroup
                showHelp={showHelp}
                helpText={trans('game_edit.field_about_help')}
                errors={errors.description}
              >
                <Field title={fieldTitles.description}>
                  <Textarea
                    name="description"
                    placeholder={intl.formatMessage({
                      id: 'game_edit.field_about_placeholder',
                    })}
                    title1={trans('game_edit.field_about_title')}
                    title2={game.name}
                  />
                </Field>
              </FieldsGroup>
            </>
          )}
        </ControlGroup>
        <ControlGroup title="game_edit.group_game" withQuestion>
          {({ showHelp }) => (
            <>
              <FieldsGroup
                fewFields
                showHelp={showHelp}
                helpText={trans('game_edit.fields_released_esrb_meta_help')}
                errors={[].concat(errors.released || [], errors.esrb_rating || [], errors.metacritic_url || [])}
              >
                <Field title={fieldTitles.released} required={!id}>
                  <Date name="released" />
                </Field>
                <Field title={fieldTitles.esrb_rating}>
                  <ESRBRating name="esrb_rating" />
                </Field>
                <Field title={fieldTitles.metacritic_url}>
                  <Metacritic />
                </Field>
              </FieldsGroup>
              <FieldsGroup
                deleted={platforms.deleted}
                group="Platfrom"
                deletedMessageId="game_edit.field_status_group_remove"
                showHelp={showHelp}
                helpText={trans('game_edit.field_platforms_desc')}
              >
                <Field title={fieldTitles.platforms}>
                  <SelectItems
                    name="platforms"
                    availableItems={allPlatforms}
                    placeholder={trans('game_edit.field_platforms_placeholder')}
                    addText={trans('game_edit.field_platforms_add')}
                    changeText={trans('game_edit.field_platforms_change')}
                    title1={trans('game_edit.field_platforms_title')}
                    title2={game.name}
                    desc={trans('game_edit.field_platforms_desc')}
                    alreadyAddedTitle={trans('game_edit.field_platforms_already_added')}
                    forbidEditCurrentItems={this.isNotEditor()}
                  />
                </Field>
              </FieldsGroup>
              <FieldsGroup
                errors={errors.genres}
                deleted={genres.deleted}
                group="Genre"
                deletedMessageId="game_edit.field_status_group_remove"
                showHelp={showHelp}
                helpText={trans('game_edit.field_genres_desc')}
              >
                <Field title={fieldTitles.genres} required={!id}>
                  <SelectItems
                    name="genres"
                    availableItems={allGenres}
                    placeholder={trans('game_edit.field_genres_placeholder')}
                    addText={trans('game_edit.field_genres_add')}
                    changeText={trans('game_edit.field_genres_change')}
                    title1={trans('game_edit.field_genres_title')}
                    title2={game.name}
                    desc={trans('game_edit.field_genres_desc')}
                    alreadyAddedTitle={trans('game_edit.field_genres_already_added')}
                  />
                </Field>
              </FieldsGroup>
              <FieldsGroup
                deleted={publishers.deleted}
                group="Publisher"
                deletedMessageId="game_edit.field_status_group_remove"
                showHelp={showHelp}
                helpText={trans('game_edit.field_publishers_desc')}
              >
                <Field title={fieldTitles.publishers}>
                  <SelectItems
                    name="publishers"
                    availableItems={allPublishers.results}
                    availableItemsLoading={allPublishers.loading}
                    searchAvailableItems={getPublishers}
                    placeholder={trans('game_edit.field_publishers_placeholder')}
                    addText={trans('game_edit.field_publishers_add')}
                    changeText={trans('game_edit.field_publishers_change')}
                    title1={trans('game_edit.field_publishers_title')}
                    title2={game.name}
                    desc={trans('game_edit.field_publishers_desc')}
                    alreadyAddedTitle={trans('game_edit.field_publishers_already_added')}
                  />
                </Field>
              </FieldsGroup>
              <FieldsGroup
                deleted={developers.deleted}
                group="Developer"
                deletedMessageId="game_edit.field_status_group_remove"
                showHelp={showHelp}
                helpText={trans('game_edit.field_developers_desc')}
              >
                <Field title={fieldTitles.developers}>
                  <SelectItems
                    name="developers"
                    availableItems={allDevelopers.results}
                    availableItemsLoading={allDevelopers.loading}
                    searchAvailableItems={getDevelopers}
                    placeholder={trans('game_edit.field_developers_placeholder')}
                    addText={trans('game_edit.field_developers_add')}
                    changeText={trans('game_edit.field_developers_change')}
                    title1={trans('game_edit.field_developers_title')}
                    title2={game.name}
                    desc={trans('game_edit.field_developers_desc')}
                    alreadyAddedTitle={trans('game_edit.field_developers_already_added')}
                  />
                </Field>
              </FieldsGroup>
              <FieldsGroup
                errors={errors.website}
                showHelp={showHelp}
                helpText={trans('game_edit.field_status_website')}
              >
                <Field title={fieldTitles.website}>
                  <Input
                    name="website"
                    placeholder="game_edit.field_website_placeholder"
                    changedMessageId="game_edit.field_status_website"
                  />
                </Field>
              </FieldsGroup>
              <FieldsGroup
                showHelp={showHelp}
                helpText={trans('game_edit.field_reddit_help')}
                errors={errors.reddit_url}
              >
                <Field title={fieldTitles.reddit_url}>
                  <Input
                    name="reddit_url"
                    placeholder="game_edit.field_reddit_placeholder"
                    changedMessageId="game_edit.field_status_subreddit"
                  />
                </Field>
              </FieldsGroup>
            </>
          )}
        </ControlGroup>
        <ControlGroup className="game-edit__main-btns">
          <MainBtns submitting={submitting} onSave={this.onSaveClick} onCancel={this.onCancelClick} />
        </ControlGroup>
      </Container>
    );
  }
}
