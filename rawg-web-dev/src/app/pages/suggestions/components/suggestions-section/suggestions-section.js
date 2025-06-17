import React, { Component } from 'react';
import PropTypes from 'prop-types';
import SVGInline from 'react-svg-inline';
import { hot } from 'react-hot-loader/root';
import slice from 'lodash/slice';

import paths from 'config/paths';

import appHelper from 'app/pages/app/app.helper';
import keysEqual from 'tools/keys-equal';
import arrayToObject from 'tools/array-to-object';

import SimpleIntlMessage from 'app/components/simple-intl-message/simple-intl-message';

import CatalogHeading from 'app/ui/catalog-heading';
import CatalogSlider from 'app/components/catalog-slider';
import GameCardMedium from 'app/components/game-card-medium';
import dotsLargeIcon from 'assets/icons/dots-large.svg';

import './suggestions-section.styl';

import { appSizeType } from 'app/pages/app/app.types';
import currentUserType from 'app/components/current-user/current-user.types';
import AddGameCard from 'app/ui/add-game-card';

const addGameIcon = <SVGInline svg={dotsLargeIcon} />;

const propTypes = {
  section: PropTypes.shape({
    games: PropTypes.arrayOf(PropTypes.object).isRequired,
    name: PropTypes.string,
    slug: PropTypes.string,
    games_count: PropTypes.number,
  }).isRequired,
  currentUser: currentUserType.isRequired,
  size: appSizeType.isRequired,
  dispatch: PropTypes.func.isRequired,
  allRatings: PropTypes.arrayOf(PropTypes.object).isRequired,
};

@hot
class SuggestionsSection extends Component {
  static propTypes = propTypes;

  constructor(...arguments_) {
    super(...arguments_);

    this.sliderRef = React.createRef();
  }

  shouldComponentUpdate(nextProperties) {
    return !keysEqual(
      this.props,
      nextProperties,
      ({ section, size }) => ({
        size,
        games_count: section.games_count,
        ...arrayToObject(
          section.games.map((gm) => ({
            slug: gm.slug,
            user_game: gm.user_game,
            user_review: gm.user_review,
          })),
          'slug',
          'game-',
        ),
      }),
      { depth: 2 },
    );
  }

  getShowAllMessage() {
    return <SimpleIntlMessage id="catalog.show_all" />;
  }

  renderGameCard(game) {
    const { size, currentUser, dispatch, allRatings } = this.props;

    return (
      <GameCardMedium
        dispatch={dispatch}
        currentUser={currentUser}
        appSize={size}
        key={game.id}
        game={game}
        allRatings={allRatings}
        short={appHelper.isPhoneSize({ size })}
      />
    );
  }

  renderAddGameCard = (path, count) => (
    <AddGameCard
      key="add-game"
      className="suggestions-section__add-game"
      title={this.getShowAllMessage()}
      path={path}
      count={count}
      icon={addGameIcon}
    />
  );

  renderGamesCards(path, count) {
    const { games } = this.props.section;
    const gamesCards = slice(games, 0, 8).map((game) => this.renderGameCard(game));

    gamesCards.push(this.renderAddGameCard(path, count));

    return gamesCards;
  }

  render() {
    const { size, section } = this.props;
    const { name, slug, games_count: count } = section;

    const path = paths.gamesSuggestionsEntity(slug);

    if (count === 0) return null;

    return (
      <section className="suggestions-section">
        <CatalogHeading heading={name} path={path} count={count} />
        <CatalogSlider className="suggestions-section__slider" size={size} saveHeightOnHover>
          {this.renderGamesCards(path, count)}
        </CatalogSlider>
      </section>
    );
  }
}

export default SuggestionsSection;
