import without from 'lodash/without';
import debounce from 'lodash/debounce';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { FormattedMessage } from 'react-intl';
import cn from 'classnames';

import { appSizeType } from 'app/pages/app/app.types';

import appHelper from 'app/pages/app/app.helper';
import SimpleIntlMessage from 'app/components/simple-intl-message/simple-intl-message';
import Button from 'app/ui/button';
import CloseButton from 'app/ui/close-button';
import InputSearch from 'app/ui/input-search';
import GameCardCompactList from 'app/components/game-card-compact-list';
import GameCardButton from 'app/ui/game-card-button';
import Loading2 from 'app/ui/loading-2';
import Arrow from 'app/ui/arrow';
import plusIcon from 'assets/icons/plus-small.svg';
import closeIcon from 'assets/icons/close.svg';
import { searchCollectionGames } from '../../collection.actions';
import './collection-search-games.styl';

export const collectionAddGamePropTypes = {
  onAddGamesClick: PropTypes.func.isRequired,
  onCloseClick: PropTypes.func.isRequired,
  visible: PropTypes.bool,
  addGameLabelId: PropTypes.string.isRequired,

  // пропсы из hoc'ов
  size: appSizeType.isRequired,
  dispatch: PropTypes.func.isRequired,
  collection: PropTypes.shape().isRequired,
  allRatings: PropTypes.arrayOf(PropTypes.object).isRequired,
};

const defaultProps = {
  visible: false,
};

@connect((state) => ({
  size: state.app.size,
  allRatings: state.app.ratings,
  collection: state.collection,
}))
export default class CollectionSearchGames extends Component {
  static propTypes = collectionAddGamePropTypes;

  static defaultProps = defaultProps;

  constructor(props) {
    super(props);

    this.state = {
      availableGames: [],
      selectedGames: [],
      search: '',
      loading: false,
      panelExpanded: false,
    };
  }

  handleChange = (value) => {
    this.setState({ search: value, loading: true });

    const { dispatch, collection } = this.props;
    const { selectedGames } = this.state;
    const { id } = collection;

    const onlyUnselected = (game) => !selectedGames.map((gm) => gm.id).includes(game.id);

    dispatch(searchCollectionGames(id, value)).then((res) => {
      this.setState({
        availableGames: res.results.filter(onlyUnselected),
        loading: false,
      });
    });
  };

  /* eslint-disable-next-line react/sort-comp */
  handleChangeDebounced = debounce(this.handleChange, 500);

  handleSelectClick = (game) => {
    let { availableGames, selectedGames } = this.state;

    availableGames = without(availableGames, game);
    selectedGames = [game, ...selectedGames];

    this.setState({ availableGames, selectedGames });
  };

  handleRemoveClick = (game) => {
    let { availableGames, selectedGames } = this.state;

    availableGames = [game, ...availableGames];
    selectedGames = without(selectedGames, game);

    this.setState({ availableGames, selectedGames });
  };

  handleAddClick = () => {
    const { onAddGamesClick, onCloseClick } = this.props;
    const { selectedGames } = this.state;

    if (selectedGames.length === 0) {
      onCloseClick();

      return;
    }

    onAddGamesClick(selectedGames);
  };

  handleCancelClick = () => {
    const { onCloseClick } = this.props;

    onCloseClick();
  };

  togglePanel = () => {
    this.setState((state) => ({ panelExpanded: !state.panelExpanded }));
  };

  renderLoading() {
    return <Loading2 radius={48} stroke={2} className="collection-add-game__loading" />;
  }

  renderGameList() {
    const { addGameLabelId, allRatings } = this.props;
    const { availableGames } = this.state;

    const gameCardProperties = {
      customButtons: (game) => (
        <GameCardButton
          onClick={() => this.handleSelectClick(game)}
          icon={plusIcon}
          inner={<SimpleIntlMessage id={`collection.${addGameLabelId}`} />}
          kind="recommend"
        />
      ),
    };

    return (
      <GameCardCompactList games={availableGames} allRatings={allRatings} gameCardProperties={gameCardProperties} />
    );
  }

  renderHeaderTitle() {
    const { selectedGames } = this.state;

    return (
      <div className="collection-add-game__panel-title">
        <FormattedMessage id="collection.add_games" values={{ gamesCount: selectedGames.length || '0' }} />
      </div>
    );
  }

  renderButtons(kind) {
    const { selectedGames, panelExpanded } = this.state;

    const buttonsClass = cn('collection-add-game__buttons', {
      'collection-add-game__buttons_opened': panelExpanded && selectedGames.length > 3,
    });

    return (
      <div className={buttonsClass}>
        <div className="collection-add-game__buttons-wrapper">
          <div
            className="collection-add-game__cancel-button"
            onClick={this.handleCancelClick}
            role="button"
            tabIndex={0}
          >
            <FormattedMessage id="collection.cancel" />
          </div>
          <Button kind={kind} size="medium" onClick={this.handleAddClick}>
            <FormattedMessage id="collection.done_button" />
          </Button>
        </div>
      </div>
    );
  }

  renderArrow() {
    const { panelExpanded } = this.state;

    return (
      <div className="profile-games__editing-panel-arrow" onClick={this.togglePanel} role="button" tabIndex={0}>
        <Arrow size="medium" direction={panelExpanded ? 'bottom' : 'top'} />
      </div>
    );
  }

  renderSelectedGames() {
    const { selectedGames } = this.state;

    const gameCardProperties = {
      customButtons: (game) => (
        <GameCardButton
          onClick={() => this.handleRemoveClick(game)}
          icon={closeIcon}
          inner={<SimpleIntlMessage id="collection.remove" />}
          kind="remove"
        />
      ),
    };

    return (
      <div className="collection-add-game__games-selected">
        <div className="collection-add-game__games-selected-inner">
          <GameCardCompactList games={selectedGames} gameCardProperties={gameCardProperties} kind="one-line" />
        </div>
      </div>
    );
  }

  renderPanel() {
    const { size } = this.props;
    const { panelExpanded } = this.state;

    const isDesktop = appHelper.isDesktopSize({ size });
    const isPhone = appHelper.isPhoneSize({ size });

    return (
      <div className="collection-add-game__panel">
        <div className="collection-add-game__panel-header">
          {this.renderHeaderTitle()}
          {isDesktop && this.renderButtons('fill-inline')}
          {isPhone && this.renderArrow()}
        </div>
        {(isDesktop || panelExpanded) && this.renderSelectedGames()}
        {isPhone && this.renderButtons('fill')}
      </div>
    );
  }

  render() {
    const { visible } = this.props;
    const { selectedGames, search, loading } = this.state;

    return (
      <div className="collection-add-game">
        <CloseButton className="collection-add-game__close-button" onClick={this.handleCancelClick} />
        <InputSearch
          className="collection-add-game__search-input"
          value={search}
          autoFocus
          visible={visible}
          onChange={this.handleChangeDebounced}
        />
        <div className="collection-add-game__games collection-add-game__games_available">
          {loading ? this.renderLoading() : this.renderGameList()}
        </div>
        {selectedGames.length > 0 && this.renderPanel()}
      </div>
    );
  }
}
