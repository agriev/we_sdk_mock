import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'app/components/link';
import { injectIntl } from 'react-intl';
import { hot } from 'react-hot-loader/root';
import cn from 'classnames';

import slice from 'lodash/slice';
import isFinite from 'lodash/isFinite';
import isArray from 'lodash/isArray';
import get from 'lodash/get';
import noop from 'lodash/noop';
import head from 'lodash/head';

import cond from 'ramda/src/cond';
import equals from 'ramda/src/equals';
import always from 'ramda/src/always';

import paths from 'config/paths';
import appHelper from 'app/pages/app/app.helper';
import SimpleIntlMessage from 'app/components/simple-intl-message';

import len from 'tools/array/len';

import Rating from 'app/ui/rating';

import gameType from 'app/pages/game/game.types';
import { appSizeType } from 'app/pages/app/app.types';
import intlShape from 'tools/prop-types/intl-shape';

import Avatar from 'app/ui/avatar';
import UserListLine from 'app/ui/user-list-line';
import Time from 'app/ui/time';
import MetascoreLabel from 'app/ui/metascore-label';

import './game-card-about.styl';

const showTags = false;

const propTypes = {
  size: PropTypes.oneOf(['normal', 'large']),
  kind: PropTypes.oneOf(['table', 'queue']),
  allRatings: PropTypes.arrayOf(PropTypes.object).isRequired,
  appSize: appSizeType.isRequired,
  game: gameType.isRequired,
  intl: intlShape.isRequired,
  opened: PropTypes.bool.isRequired,
  toggleOpen: PropTypes.func,
  gameOwner: PropTypes.shape(),
  showAddedBy: PropTypes.bool,
  showReleaseDate: PropTypes.bool,
  showPlaytime: PropTypes.bool,
  showMetacritic: PropTypes.bool,
  additionalAboutItem: PropTypes.shape({
    title: PropTypes.node,
    getValue: PropTypes.func,
  }),
};

const defaultProps = {
  size: 'normal',
  kind: 'table',
  gameOwner: undefined,
  additionalAboutItem: undefined,
  showAddedBy: false,
  showReleaseDate: false,
  showPlaytime: false,
  showMetacritic: false,
  toggleOpen: noop,
};

@hot
@injectIntl
class GameCardAbout extends Component {
  static propTypes = propTypes;

  static defaultProps = defaultProps;

  getVisibleItems(items, getPath) {
    const { opened } = this.props;

    if (!isArray(items)) {
      return null;
    }

    const visibleItems = opened ? items : slice(items, 0, 2);
    const itemsData = visibleItems.map((item) => ({
      text: item.name,
      path: getPath(item.slug),
    }));
    const needDots = items.length > 2 && !opened;

    return this.renderList(itemsData, needDots);
  }

  getKind = cond([
    [equals('table'), always('game-card-about_table')],
    [equals('queue'), always('game-card-about_queue')],
  ]);

  isMoreThanFourItems() {
    const { game, opened } = this.props;
    const { genres, tags, rating_top: ratingTop, metacritic, charts } = game;

    const genresLength = get(genres, 'length');
    const tagsLength = get(tags, 'length');

    return (
      !opened && !!ratingTop && isFinite(metacritic) && charts && charts.year && genresLength > 0 && tagsLength > 0
    );
  }

  needViewMore() {
    const { appSize } = this.props;

    return appHelper.isPhoneSize({ size: appSize });
  }

  renderMetacritic() {
    const { game, intl, opened, showMetacritic } = this.props;

    const { metacritic } = game;

    if (showMetacritic && opened && isFinite(metacritic)) {
      const title = intl.formatMessage({ id: 'game.metacritic_short' });
      const value = <MetascoreLabel rating={metacritic} />;

      return this.renderAboutItem(title, value);
    }

    return null;
  }

  renderCharts() {
    const { game, opened, intl } = this.props;
    const { charts } = game;

    if (opened && charts && !!charts.year) {
      const title = intl.formatMessage({ id: 'shared.game_chart' });
      const value = (() => {
        if (!charts) return null;

        const text = `#${charts.year.position} ${intl.formatMessage(
          { id: 'game.chart_year' },
          { year: charts.year.year },
        )}`;
        return this.renderLink({ text, path: `${paths.games}/${charts.year.year}` });
      })();

      return this.renderAboutItem(title, value);
    }

    return null;
  }

  renderTags() {
    if (!showTags) {
      return null;
    }

    const { game, opened, intl } = this.props;
    const { tags } = game;

    if (opened && len(tags) > 0 && !this.isMoreThanFourItems()) {
      const title = `${intl.formatMessage({ id: 'game.tags' })}:`;
      const value = this.getVisibleItems(tags, paths.tag);

      return this.renderAboutItem(title, value);
    }

    return null;
  }

  renderPlaytime() {
    const { game, intl, showPlaytime } = this.props;
    const { playtime } = game;

    if (showPlaytime && !!playtime && !this.isMoreThanFourItems()) {
      const title = intl.formatMessage({ id: 'game.playtime_label' });
      const value = `${intl.formatMessage({ id: 'game.playtime_short' }, { playtime })}`;

      return this.renderAboutItem(title, value);
    }

    return null;
  }

  renderReleaseDate() {
    const { game, intl, showReleaseDate, opened } = this.props;

    if (game.can_play) {
      return null;
    }

    const { released } = game;

    if ((opened || showReleaseDate) && !!released) {
      const title = intl.formatMessage({ id: 'game.release_date' });
      const value = (
        <Time
          date={released}
          format={{
            timeZone: 'UTC',
          }}
        />
      );

      return this.renderAboutItem(title, value);
    }

    return null;
  }

  renderLink({ text, path }) {
    return (
      <Link className="game-card-about__link" to={path}>
        {text}
      </Link>
    );
  }

  renderList(items, needDots = false) {
    return items.map((item, index) => {
      if (index !== items.length - 1) {
        return <span key={item.text}>{this.renderLink(item)}, </span>;
      }

      return (
        <span key={item.text}>
          {this.renderLink(item)}
          {needDots && ' …'}
        </span>
      );
    });
  }

  renderRating = (id) => {
    const { allRatings } = this.props;

    if (id) {
      return <Rating className="game-card-about__rating" rating={id} allRatings={allRatings} kind="text" />;
    }

    return null;
  };

  renderAdditional() {
    const { game, opened, additionalAboutItem } = this.props;

    if (additionalAboutItem && opened) {
      return this.renderAboutItem(additionalAboutItem.title, additionalAboutItem.getValue(game));
    }

    return null;
  }

  renderPlayerRating() {
    const { gameOwner, game, opened } = this.props;

    if (!gameOwner || !game.user_rating || !opened) {
      return null;
    }

    return (
      <li className="game-card-about__item game-card-about__item_v-center">
        <div className="game-card-about__term game-card-about__term_flex">
          <Avatar className="rating__avatar" size={20} src={gameOwner.avatar} profile={gameOwner} />
          <span>rating:</span>
        </div>
        <div className="game-card-about__desription">{this.renderRating(get(game, 'user_rating'))}</div>
      </li>
    );
  }

  renderAddedBy() {
    const { game, showAddedBy, opened } = this.props;
    const { friends } = game;
    const friendsLength = len(friends);
    const friend = head(friends);

    if ((opened || showAddedBy) && friendsLength > 0) {
      return (
        <li className="game-card-about__item">
          <div className="game-card-about__term">
            <SimpleIntlMessage id="shared.game_added_by" />:
          </div>
          <div className="game-card-about__desription game-card-about__desription_flex">
            {friendsLength === 1 && (
              <div className="game-card-about__desription__user">
                <Avatar
                  className="game-card-about__desription__avatar"
                  size={16}
                  src={friend.avatar}
                  profile={friend}
                />
                <Link to={paths.profile(friend.slug)}>{friend.full_name || friend.username}</Link>
              </div>
            )}
            {friendsLength > 1 && (
              <UserListLine
                className="game-card-about__desription__users"
                users={friends}
                maxUsers={5}
                avatarSize={16}
                noCount
              />
            )}
          </div>
        </li>
      );
    }

    return null;
  }

  renderGenres() {
    const { game, intl, opened } = this.props;
    const { genres } = game;

    if (opened && isArray(genres) && genres.length > 0) {
      const genresTitle = intl.formatMessage({ id: 'game.genres' });
      const genresValue = this.getVisibleItems(genres, paths.genre);

      return this.renderAboutItem(genresTitle, genresValue);
    }

    return null;
  }

  renderAboutItem(term, description) {
    return (
      <li className="game-card-about__item">
        <div className="game-card-about__term">{term}:</div>
        <div className="game-card-about__desription">{description}</div>
      </li>
    );
  }

  renderViewMore() {
    if (!this.needViewMore()) {
      return null;
    }

    const { opened, toggleOpen, intl } = this.props;

    const viewLabel = intl.formatMessage({
      id: `shared.${opened ? 'view_less' : 'view_more'}`,
    });

    return (
      <li className="game-card-about__item game-card-about__item_view-more game-card-about__item_center">
        <span className="game-card-about__more" onClickCapture={toggleOpen} role="button" tabIndex="0">
          {viewLabel}
        </span>
      </li>
    );
  }

  render() {
    const { size, kind } = this.props;

    return (
      <ul className={cn('game-card-about', `game-card-about_${size}`, this.getKind(kind))}>
        {this.renderMetacritic()}
        {this.renderAdditional()}
        {this.renderReleaseDate()}
        {this.renderAddedBy()}
        {this.renderPlayerRating()}
        {this.renderGenres()}
        {this.renderCharts()}
        {this.renderTags()}
        {this.renderPlaytime()}
        {this.renderViewMore()}
      </ul>
    );
  }
}

export default GameCardAbout;
