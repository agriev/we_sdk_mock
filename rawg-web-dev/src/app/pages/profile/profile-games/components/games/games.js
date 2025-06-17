import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { injectIntl } from 'react-intl';
import difference from 'lodash/difference';

import currentUserTypes from 'app/components/current-user/current-user.types';
import { platforms as appPlatformsType, appSizeType } from 'app/pages/app/app.types';
import intlShape from 'tools/prop-types/intl-shape';

import {
  multipleEditStatus,
  multipleEditPlatforms,
  multipleAddToCollections,
  multipleDelete,
  multipleUndo,
  multipleLoadCollections,
} from 'app/pages/profile/profile.actions';
import { getInitialStateStatuses } from 'app/pages/profile/profile-games/profile-games.helper';
import { GAME_ALL_STATUSES } from 'app/pages/game/game.types';

import GamesByCategories from '../games-by-categories';
import EditingPanel from '../editing-panel';

const propTypes = {
  dispatch: PropTypes.func.isRequired,
  editing: PropTypes.bool.isRequired,
  platforms: appPlatformsType.isRequired,
  updateCategories: PropTypes.func.isRequired,
  toggleEditing: PropTypes.func.isRequired,
  handleGameCardStatusChange: PropTypes.func.isRequired,
  profile: PropTypes.shape().isRequired,
  currentUser: currentUserTypes.isRequired,
  filter: PropTypes.shape().isRequired,
  allRatings: PropTypes.arrayOf(PropTypes.object).isRequired,
  status: PropTypes.string,
  searchValue: PropTypes.string.isRequired,
  isWishlist: PropTypes.bool.isRequired,
  size: appSizeType.isRequired,
  load: PropTypes.func.isRequired,
  path: PropTypes.string.isRequired,
  intl: intlShape.isRequired,
};

const defaultProps = {
  status: '',
};

@injectIntl
export default class Games extends Component {
  static propTypes = propTypes;

  static defaultProps = defaultProps;

  constructor(props) {
    super(props);

    const { path, intl } = this.props;
    const statusesValues = difference(GAME_ALL_STATUSES, ['owned']);

    this.selectedPlatforms = [];

    this.state = {
      prevPath: path,
      action: '',
      selectedGames: [],
      editedGamesCount: 0,
      statuses: getInitialStateStatuses(statusesValues, intl),
      collections: [],
      undoRes: null,
    };
  }

  static getDerivedStateFromProps(props, state) {
    if (props.path !== state.prevPath) {
      return {
        selectedGames: [],
        editedGamesCount: 0,
        action: '',
      };
    }

    return null;
  }

  toggleEditing = () => {
    this.setState({
      selectedGames: [],
      editedGamesCount: 0,
      action: '',
    });
    this.props.toggleEditing();
  };

  unselect = () => {
    this.setState({
      selectedGames: [],
      editedGamesCount: 0,
    });
  };

  undo = () => {
    const { dispatch, updateCategories } = this.props;
    const { undoRes, action } = this.state;

    dispatch(multipleUndo(undoRes, action)).then(() => {
      updateCategories();
      this.setState({
        selectedGames: [],
        editedGamesCount: 0,
        action: '',
      });
    });
  };

  handleStatusChange = (activeItems) => {
    const { dispatch, updateCategories } = this.props;
    const { selectedGames } = this.state;

    const status = activeItems[0].id;

    dispatch(multipleEditStatus(status, selectedGames)).then((res) => {
      updateCategories();
      this.setState({
        action: 'status',
        selectedGames: [],
        undoRes: res,
      });
    });
  };

  handlePlatformsChange = (activeItems = []) => {
    this.selectedPlatforms = activeItems;
  };

  handlePlatformsClose = () => {
    if (this.selectedPlatforms.length === 0) {
      return;
    }

    const { dispatch } = this.props;
    const { selectedGames } = this.state;

    const platforms = this.selectedPlatforms;
    const platformIds = this.selectedPlatforms.map((p) => p.id);
    const gameIds = selectedGames.map((g) => g.id);

    this.selectedPlatforms = [];

    dispatch(multipleEditPlatforms(platformIds, gameIds, { platforms })).then((res) => {
      this.setState({
        action: 'platforms',
        selectedGames: [],
        undoRes: res,
      });
    });
  };

  handleCollectionsOpen = () => {
    const { dispatch } = this.props;

    dispatch(multipleLoadCollections()).then((res) => {
      this.setState({ collections: res.results });
    });
  };

  handleCollectionsSearch = (search) => {
    const { dispatch } = this.props;

    dispatch(multipleLoadCollections(search)).then((res) => {
      this.setState({ collections: res.results });
    });
  };

  handleCollectionsChange = (activeItems = []) => {
    this.selectedCollections = activeItems;
  };

  handleCollectionsClose = () => {
    if (!Array.isArray(this.selectedCollections) || this.selectedCollections.length === 0) {
      return;
    }

    const { dispatch, updateCategories } = this.props;
    const { selectedGames } = this.state;

    const collectionIds = this.selectedCollections.map((p) => p.id);
    const gameIds = selectedGames.map((g) => g.id);

    this.selectedCollections = [];

    dispatch(multipleAddToCollections(collectionIds, gameIds)).then((res) => {
      updateCategories();
      this.setState({
        action: 'collections',
        selectedGames: [],
        undoRes: res,
      });
    });
  };

  handleDelete = () => {
    const { dispatch, updateCategories } = this.props;
    const { selectedGames } = this.state;

    const gameIds = selectedGames.map((g) => g.id);

    dispatch(multipleDelete(gameIds)).then((res) => {
      updateCategories();
      this.setState({
        action: 'delete',
        selectedGames: [],
        undoRes: res,
      });
    });
  };

  handleSelectClick = (game) => {
    this.setState((state) => ({
      action: '',
      selectedGames: [...state.selectedGames, game],
      editedGamesCount: state.selectedGames.length + 1,
    }));
  };

  handleRemoveClick = (game) => {
    this.setState((state) => ({
      action: '',
      selectedGames: state.selectedGames.filter((g) => g.id !== game.id),
      editedGamesCount: state.selectedGames.length - 1,
    }));
  };

  renderGames() {
    const {
      currentUser,
      allRatings,
      profile,
      dispatch,
      status,
      isWishlist,
      searchValue,
      filter,
      editing,
      handleGameCardStatusChange,
      load,
      size,
    } = this.props;

    const { selectedGames } = this.state;

    return (
      <GamesByCategories
        dispatch={dispatch}
        profile={profile}
        currentUser={currentUser}
        allRatings={allRatings}
        filter={filter}
        searchValue={searchValue}
        categories={GAME_ALL_STATUSES}
        status={status}
        editing={editing}
        isWishlist={isWishlist}
        selectedGames={selectedGames}
        load={load}
        handleSelectClick={this.handleSelectClick}
        handleRemoveClick={this.handleRemoveClick}
        handleGameCardStatusChange={handleGameCardStatusChange}
        appSize={size}
      />
    );
  }

  renderEditingPanel() {
    const { size, platforms = [] } = this.props;

    const { action, selectedGames, editedGamesCount, statuses, collections } = this.state;

    return (
      <EditingPanel
        size={size}
        platforms={platforms}
        statuses={statuses}
        collections={collections}
        action={action}
        selectedGames={selectedGames}
        editedGamesCount={editedGamesCount}
        toggleEditing={this.toggleEditing}
        handleDelete={this.handleDelete}
        handlePlatformsChange={this.handlePlatformsChange}
        handlePlatformsClose={this.handlePlatformsClose}
        handleCollectionsOpen={this.handleCollectionsOpen}
        handleCollectionsChange={this.handleCollectionsChange}
        handleCollectionsClose={this.handleCollectionsClose}
        handleCollectionsSearch={this.handleCollectionsSearch}
        handleStatusChange={this.handleStatusChange}
        unselect={this.unselect}
        undo={this.undo}
      />
    );
  }

  render() {
    const { editing } = this.props;

    return (
      <>
        {this.renderGames()}
        {editing && this.renderEditingPanel()}
      </>
    );
  }
}
