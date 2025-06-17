import React from 'react';
import PropTypes from 'prop-types';
import debounce from 'lodash/debounce';

import appHelper from 'app/pages/app/app.helper';
import { appSizeType } from 'app/pages/app/app.types';
import InputSearchMain from 'app/ui/input-search-main/input-search-main';

import intlShape from 'tools/prop-types/intl-shape';

import { allGames as allGamesType } from 'app/pages/search/search.types';
import { findAllGames } from 'app/pages/search/search.actions';
import SearchResults from 'app/ui/search-results/search-results';
import Dropdown from 'app/ui/dropdown/dropdown';
import Platforms from 'app/ui/platforms';

import './review-form.game-selector.styl';

class ReviewFormGameSelector extends React.Component {
  static propTypes = {
    onSelectGame: PropTypes.func.isRequired,
    allGames: allGamesType.isRequired,
    size: appSizeType.isRequired,
    dispatch: PropTypes.func.isRequired,
    allRatings: PropTypes.arrayOf(PropTypes.object).isRequired,
    intl: intlShape.isRequired,
  };

  constructor(props) {
    super(props);
    this.state = {
      game: undefined,
      value: '',
    };
  }

  handleChange = (value) => {
    const { dispatch } = this.props;
    const { value: stateValue } = this.state;

    if (stateValue !== value) {
      this.setState({ value });
      dispatch(findAllGames(value, 1));
    }
  };

  /* eslint-disable-next-line react/sort-comp */
  handleChangeDebounced = debounce(this.handleChange, 500);

  handleClose = () => this.setState({ value: '' });

  handleSelectGame = (event, game) => {
    event.stopPropagation();
    event.preventDefault();

    if (game && game.user_review) {
      // Не выбирать игры, на которые уже есть ревью
      return;
    }

    this.props.onSelectGame(game);
    this.setState({
      value: '',
      game,
    });
  };

  renderSearchResults = () => {
    const { allGames, size, dispatch, allRatings } = this.props;
    const { value } = this.state;

    if (value === '') {
      return null;
    }

    return (
      <SearchResults
        tab="games"
        results={allGames.results.slice(0, 5)}
        count={allGames.count}
        size={size}
        query={value}
        inputValue={value}
        dispatch={dispatch}
        allRatings={allRatings}
        closeSearch={this.handleClose}
        onClick={this.handleSelectGame}
        checkGameReviewStatus
        gameSize="small"
      />
    );
  };

  render = () => {
    const { game, value, size } = this.state;

    return (
      <div className="review-form__game-selector">
        {!game && (
          <InputSearchMain
            placeholder={this.props.intl.formatMessage({ id: 'activity.select_game' })}
            value={value}
            onChange={this.handleChangeDebounced}
          />
        )}

        {game && (
          <div className="review-form__game-selector__selected-game">
            <div
              className="review-form__game-selector__selected-game__image"
              style={{ backgroundImage: `url(${game.background_image})` }}
            />
            <div className="review-form__game-selector__selected-game__name">
              <div>{game.name}</div>
              <Platforms
                platforms={game.platforms}
                parentPlatforms={game.parent_platforms}
                size={appHelper.isDesktopSize({ size }) ? 'big' : 'medium'}
                icons
                parents
              />
            </div>
            <div
              className="review-form__game-selector__selected-game__close"
              onClick={(event) => this.handleSelectGame(event, undefined)}
              role="button"
              tabIndex={0}
            />
          </div>
        )}

        <Dropdown
          renderButton={() => {}}
          renderContent={this.renderSearchResults}
          className="review-form__game-selector__search-results"
          containerClassName="review-form__game-selector__container_search-results"
          kind="search-results"
          opened={value !== ''}
          onClose={this.handleClose}
        />
      </div>
    );
  };
}

export default ReviewFormGameSelector;
