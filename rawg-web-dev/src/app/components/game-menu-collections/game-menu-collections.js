import React, { Component } from 'react';
import PropTypes from 'prop-types';
import cn from 'classnames';
import { connect } from 'react-redux';
import { Link } from 'app/components/link';
import { injectIntl, FormattedMessage } from 'react-intl';
import { hot } from 'react-hot-loader/root';

import noop from 'lodash/noop';

import './game-menu-collections.styl';

import gameType from 'app/pages/game/game.types';
import intlShape from 'tools/prop-types/intl-shape';

import paths from 'config/paths';
import SelectContent from 'app/ui/select/select-content';

import { loadGameUserCollections, addGameToCollection, removeGameFromCollection } from 'app/pages/game/game.actions';

export const gameMenuCollectionsPropTypes = {
  game: gameType.isRequired,
  collections: PropTypes.arrayOf(PropTypes.object),
  onSearch: PropTypes.func,
  onItemClick: PropTypes.func,
  className: PropTypes.string,
  dispatch: PropTypes.func.isRequired,
  intl: intlShape.isRequired,
};

const defaultProps = {
  className: '',
  collections: undefined,
  onSearch: undefined,
  onItemClick: noop,
};

@hot
@injectIntl
@connect()
export default class GameMenuCollections extends Component {
  static propTypes = gameMenuCollectionsPropTypes;

  static defaultProps = defaultProps;

  onSearch = (query) => {
    const { dispatch, game, onSearch } = this.props;

    if (onSearch) {
      onSearch(query);
    } else {
      dispatch(loadGameUserCollections(game.id, game.slug, query));
    }
  };

  onItemClick = ({ clickedItem }) => {
    const { dispatch, game } = this.props;
    const { id, slug, active } = clickedItem;

    if (active) {
      dispatch(addGameToCollection(id, slug, game.id, game.slug));
    } else {
      dispatch(removeGameFromCollection(id, slug, game.id, game.slug));
    }

    this.props.onItemClick(clickedItem);
  };

  render() {
    const { intl, className, game, collections } = this.props;
    const cols = collections || game.user_collections || [];
    const addUrl = `${paths.collectionCreate}?addGame=${game.id}`;
    const link = (
      <Link to={addUrl} href={addUrl}>
        <FormattedMessage id="shared.game_menu_collections_create" />
      </Link>
    );

    return (
      <SelectContent
        title={intl.formatMessage({ id: 'shared.game_menu_collections_title' })}
        className={cn('game__collections-list', className)}
        onChange={this.onItemClick}
        onSearch={this.onSearch}
        tructateTitles={45}
        items={cols.map((col) => ({
          id: col.id,
          slug: col.slug,
          value: col.name,
          active: col.game_in_collection,
        }))}
        link={link}
        multiple
        search
      />
    );
  }
}
