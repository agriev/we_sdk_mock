import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { browserHistory } from 'react-router';
import cn from 'classnames';

import keysEqual from 'tools/keys-equal';
import paths from 'config/paths';
import { changeTab } from 'app/pages/search/search.actions';

import Loading2 from 'app/ui/loading-2';
import CollectionCard from 'app/ui/collection-card';
import UserCard from 'app/ui/user-card';
import PersonCard from 'app/ui/person-card';
import GameCardCompact from 'app/components/game-card-compact';

import SearchDropdownFooter from 'app/ui/search-dropdown-footer';

import currentUserType from 'app/components/current-user/current-user.types';

import './search-results.styl';

class SearchResults extends Component {
  static propTypes = {
    allRatings: PropTypes.arrayOf(PropTypes.object).isRequired,
    count: PropTypes.number,
    loading: PropTypes.bool,
    query: PropTypes.string,
    closeSearch: PropTypes.func,
    maxResults: PropTypes.number,
    dispatch: PropTypes.func,
    tab: PropTypes.string,
    results: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
    isFooter: PropTypes.bool,
    className: PropTypes.string,
    inputValue: PropTypes.string,
    size: PropTypes.string,
    onClick: PropTypes.func,
    gameSize: PropTypes.oneOf(['medium', 'small']),
    currentUser: currentUserType,
    disbableKeydownHandlers: PropTypes.bool,
    currentSelection: PropTypes.number,
  };

  static defaultProps = {
    count: 0,
    loading: false,
    query: '',
    closeSearch: () => {},
    maxResults: 5,
    dispatch: () => {},
    tab: 'games',
    isFooter: false,
    className: '',
    inputValue: '',
    size: 'desktop',
    onClick: undefined,
    gameSize: 'medium',
    currentUser: undefined,
    disbableKeydownHandlers: false,
    currentSelection: undefined,
  };

  constructor(props) {
    super(props);

    const { query, tab } = this.props;

    this.state = {
      query,
      tab,
      keyboardSelected: -1,
    };
  }

  componentDidMount() {
    const { disbableKeydownHandlers } = this.props;

    if (!disbableKeydownHandlers) {
      document.addEventListener('keydown', this.handleKeyDown);
    }
  }

  static getDerivedStateFromProps(props, state) {
    const { query, tab } = props;

    if (state.query !== query || state.tab !== tab) {
      return {
        tab,
        query,
        keyboardSelected: -1,
      };
    }

    return null;
  }

  shouldComponentUpdate(nextProperties, nextState) {
    const propsIsDifferent = !keysEqual(this.props, nextProperties, [
      'loading',
      'query',
      'results',
      'isFooter',
      'inputValue',
      'currentSelection',
    ]);

    const stateIsDifferent = !keysEqual(this.state, nextState, ['keyboardSelected']);

    return propsIsDifferent || stateIsDifferent;
  }

  componentWillUnmount() {
    const { disbableKeydownHandlers } = this.props;

    if (!disbableKeydownHandlers) {
      document.removeEventListener('keydown', this.handleKeyDown);
    }
  }

  changeTab = (currentTab, count, isRight) => {
    const tabs = ['games', 'library', 'collections', 'persons', 'users'];

    const checkDirection = (index) =>
      isRight
        ? this.props.dispatch(changeTab(tabs[index + 1 < tabs.length ? index + 1 : 0]))
        : this.props.dispatch(changeTab(tabs[index - 1 < 0 ? tabs.length - 1 : index - 1]));

    tabs.map((tab, index) => (tab === currentTab ? changeTab(checkDirection(index)) : null));
  };

  handleKeyDown = (event) => {
    const { maxResults, results, tab } = this.props;

    switch (event.keyCode) {
      // Up
      case 38:
        this.setState(({ keyboardSelected }) => ({
          keyboardSelected: keyboardSelected > 0 ? keyboardSelected - 1 : 0,
        }));
        break;

      // Down
      case 40:
        this.setState((state) => ({
          keyboardSelected:
            state.keyboardSelected < (results.length < maxResults ? results.length : maxResults) - 1
              ? state.keyboardSelected + 1
              : (results.length > maxResults ? maxResults : results.length) - 1,
        }));
        break;

      // Enter
      case 13:
        if (this.props.onClick) {
          if (this.state.keyboardSelected >= 0) {
            this.props.onClick(event, results[this.state.keyboardSelected]);
          } else {
            //
          }
        } else {
          // eslint-disable-next-line no-lonely-if
          if (this.state.keyboardSelected >= 0) {
            browserHistory.push(paths.searchResult(tab, results[this.state.keyboardSelected].slug));
          } else {
            browserHistory.push(paths.search(this.props.query));
          }
        }
        break;

      // Esc
      case 27:
        this.props.closeSearch();
        break;

      default:
        break;
    }
  };

  renderByType = (type, result) => {
    const { gameSize, currentUser, dispatch, allRatings } = this.props;

    switch (type) {
      case 'games':
      case 'library':
      default:
        return (
          <GameCardCompact
            className="search-results__game-card"
            game={result}
            size={gameSize}
            currentUser={currentUser}
            dispatch={dispatch}
            allRatings={allRatings}
          />
        );
      case 'collections':
        return <CollectionCard collection={result} kind="inline" className="search-results__collection-card" />;
      case 'persons':
        return <PersonCard person={result} size={this.props.size} className="search-results__person-card" />;
      case 'users':
        return <UserCard className="search-results__user-card" user={result} avatarSize={56} />;
    }
  };

  render() {
    const { keyboardSelected } = this.state;
    const { loading, results, tab, count, isFooter, inputValue, className, onClick, currentSelection } = this.props;

    return (
      <div className={cn('search-results', className)}>
        {loading && <Loading2 className="search-results__loading" radius={48} stroke={2} />}
        {!loading &&
          results.map((result, index) => (
            <div
              key={result.id}
              className={cn('search-results__item', {
                'search-results__game-selected': keyboardSelected === index || currentSelection === index,
              })}
              onClickCapture={onClick ? (event) => onClick(event, result) : undefined}
              role="button"
              tabIndex={0}
            >
              {this.renderByType(tab, result)}
            </div>
          ))}
        {!loading && isFooter && (
          <SearchDropdownFooter count={count} maxResults={5} query={inputValue} currentTab={tab} />
        )}
      </div>
    );
  }
}

export default SearchResults;
