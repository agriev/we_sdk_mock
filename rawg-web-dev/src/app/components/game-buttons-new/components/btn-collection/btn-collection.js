import React from 'react';
import PropTypes from 'prop-types';
import { compose } from 'recompose';
import { hot } from 'react-hot-loader/root';
import { injectIntl } from 'react-intl';
import cn from 'classnames';

import filter from 'lodash/filter';
import some from 'lodash/some';

import id from 'tools/id';

import './btn-collection.styl';

import gameType from 'app/pages/game/game.types';
import { appSizeType } from 'app/pages/app/app.types';
import intlShape from 'tools/prop-types/intl-shape';

import GameMenuCollections from 'app/components/game-menu-collections';
import { loadGameUserCollections } from 'app/pages/game/game.actions';
import Dropdown from 'app/ui/dropdown';
import simpleTruncate from 'tools/string/simple-truncate';
import checkLogin from 'tools/check-login';
import appHelper from 'app/pages/app/app.helper';

const hoc = compose(
  hot,
  injectIntl,
);

const propTypes = {
  game: gameType.isRequired,
  appSize: appSizeType.isRequired,
  dispatch: PropTypes.func.isRequired,
  intl: intlShape.isRequired,
};

const defaultProps = {};

class ButtonCollectionComponent extends React.Component {
  static propTypes = propTypes;

  static defaultProps = defaultProps;

  constructor(properties, context) {
    super(properties, context);

    this.state = {
      opened: false,
    };
  }

  componentDidMount() {
    const { game, dispatch } = this.props;

    dispatch(loadGameUserCollections(game.id, game.slug));
  }

  isSomeAdded = () => some(this.props.game.user_collections, { game_in_collection: true });

  getSubtitle = () => this.props.intl.formatMessage(id(this.isSomeAdded() ? 'game.saved_to' : 'game.save_to'));

  getTitle = () => {
    const { game, appSize, intl } = this.props;

    const added = filter(game.user_collections, { game_in_collection: true });

    if (added.length > 1) {
      return intl.formatMessage(id('game.collections'), { count: added.length });
    }

    if (added.length === 1) {
      return appHelper.isDesktopSize(appSize) ? simpleTruncate(10, added[0].name) : simpleTruncate(24, added[0].name);
    }

    return intl.formatMessage(id('game.collection'));
  };

  getIcon = () => {
    if (this.isSomeAdded()) {
      return <div className="btn-collection__icon btn-collection__icon-added" />;
    }

    return <div className="btn-collection__icon btn-collection__icon-add" />;
  };

  onBtnClick = (event) => {
    event.preventDefault();

    checkLogin(this.props.dispatch, () => {
      this.setState({ opened: true });
    });
  };

  onDropdownClose = () => {
    this.setState({ opened: false });
  };

  renderCollectionDropdown() {
    const { game } = this.props;
    const { opened } = this.state;

    const dropdownContent = () => <GameMenuCollections game={game} />;

    return (
      <Dropdown
        opened={opened}
        className="game-card-buttons__dropdown"
        containerClassName="game-card-buttons__dropdown-wrapper"
        kind="card"
        onClose={this.onDropdownClose}
        renderContent={dropdownContent}
      />
    );
  }

  render() {
    const isActive = this.isSomeAdded();

    return (
      <>
        {this.renderCollectionDropdown()}
        <div
          className={cn('btn-collection', {
            'btn-collection_inactive': !isActive,
            'btn-collection_active': isActive,
          })}
          onClick={this.onBtnClick}
          role="button"
          tabIndex={0}
        >
          <div className="btn-collection__text">
            <div className="btn-collection__subtitle">{this.getSubtitle()}</div>
            <div className="btn-collection__title">{this.getTitle()}</div>
          </div>
          {this.getIcon()}
        </div>
      </>
    );
  }
}

ButtonCollectionComponent.propTypes = propTypes;
ButtonCollectionComponent.defaultProps = defaultProps;

const ButtonCollection = hoc(ButtonCollectionComponent);

export default ButtonCollection;
