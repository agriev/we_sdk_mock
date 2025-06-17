import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'app/components/link';
import { push, goBack } from 'react-router-redux';
import { scroller, Link as ScrollLink } from 'react-scroll';
import { injectIntl } from 'react-intl';
import SVGInline from 'react-svg-inline';
import cn from 'classnames';

import throttle from 'lodash/throttle';
import get from 'lodash/get';
import find from 'lodash/find';

import reject from 'ramda/src/reject';

import paths from 'config/paths';

import GameCardCompact from 'app/components/game-card-compact';
import Time from 'app/ui/time';

import arrowIcon from 'assets/icons/arrow-thin.svg';

import gameType from 'app/pages/game/game.types';
import currentUserType from 'app/components/current-user/current-user.types';
import intlShape from 'tools/prop-types/intl-shape';

import './game-header.styl';

import getScrollContainer from 'tools/get-scroll-container';
import getScrollTop from 'tools/get-scroll-top';

@injectIntl
class GameHeader extends PureComponent {
  static propTypes = {
    game: gameType.isRequired,
    genres: PropTypes.arrayOf(PropTypes.object).isRequired,
    dispatch: PropTypes.func.isRequired,
    currentUser: currentUserType.isRequired,
    allRatings: PropTypes.arrayOf(PropTypes.object).isRequired,
    activeSection: PropTypes.string,
    isMainPage: PropTypes.bool,
    intl: intlShape.isRequired,
    forceVisible: PropTypes.bool,
  };

  static defaultProps = {
    isMainPage: false,
    activeSection: undefined,
  };

  constructor(props) {
    super(props);

    this.state = { visible: false };

    this.pageScrollHandler = throttle(this.pageScrollHandler, 100);
  }

  componentDidMount() {
    this.pageScrollHandler();
    // this.startPoint = window.document.querySelector('.page__header').getBoundingClientRect().height;

    getScrollContainer().addEventListener('scroll', this.pageScrollHandler);
  }

  static getDerivedStateFromProps(props, state) {
    return {
      visible: typeof props.forceVisible === 'boolean' ? props.forceVisible : state.visible,
    };
  }

  componentWillUnmount() {
    getScrollContainer().removeEventListener('scroll', this.pageScrollHandler);
  }

  getMessage(id, values) {
    const { intl } = this.props;

    return intl.formatMessage({ id }, values);
  }

  getValueWithHashtag(value) {
    return `# ${value}`;
  }

  getGamePageInfo = () => {
    const { activeSection } = this.props;

    const addElement = (key, message) => ({
      active: activeSection === key,
      element: scroller.get(key),
      label: this.getMessage(message),
      key,
    });

    const info = [
      addElement('about', 'game.floating-header_basic-info'),
      addElement('suggestions', 'game.floating-header_suggestions'),
      addElement('youtube', 'game.floating-header_youtube'),
      addElement('persons', 'game.floating-header_persons'),
      addElement('imgur', 'game.floating-header_imgur'),
      addElement('achievements', 'game.floating-header_achievements'),
      addElement('reddit', 'game.floating-header_reddit'),
      addElement('twitch', 'game.floating-header_twitch'),
      addElement('events', 'game.floating-header_events'),
      addElement('reviews', 'game.floating-header_reviews'),
    ];

    const missingBlocks = ({ element }) => {
      return !element;
    };

    return reject(missingBlocks, info).map(({ active, label, key }) => (
      <li className="game-header__info-item" key={key}>
        <ScrollLink
          className={cn('game-header__label', { active })}
          activeClass="active"
          duration={0}
          offset={-120}
          to={key}
          smooth
          spy
        >
          {label}
        </ScrollLink>
      </li>
    ));
  };

  getGameSubpageInfo = () => {
    const { genres, game } = this.props;
    const { released, playtime, charts } = game;

    const info = [];

    if (released) {
      info.push({
        label: this.getMessage('game.release_date'),
        value: <Time date={released} />,
        key: 'released',
      });
    }

    if (playtime) {
      info.push({
        label: this.getMessage('game.playtime_label'),
        value: `${playtime}h`,
        key: 'playtime',
      });
    }

    if (charts) {
      const { genre, year } = charts;

      if (genres && genre && genre.name) {
        const genreSlug = get(find(genres, { name: genre.name }), 'slug');

        info.push({
          label: genre.name,
          value: this.getValueWithHashtag(genre.position),
          path: paths.genre(genreSlug),
          key: 'genre',
        });
      }

      if (year && year.year) {
        info.push({
          label: this.getMessage('game.chart_year', { year: year.year }),
          value: this.getValueWithHashtag(year.position),
          path: `${paths.games}/${year.year}`,
          key: 'year',
        });
      }
    }

    return info.map((item) => (
      <li className="game-header__info-item" key={item.key}>
        <span className="game-header__value">{item.value}</span>
        <span className="game-header__label">
          {item.path ? (
            <Link to={item.path} href={item.path}>
              {item.label}
            </Link>
          ) : (
            item.label
          )}
        </span>
      </li>
    ));
  };

  getInfo() {
    const { isMainPage } = this.props;

    return isMainPage ? this.getGamePageInfo() : this.getGameSubpageInfo();
  }

  goBack = () => {
    const { dispatch } = this.props;
    if (window.history.length > 1) {
      dispatch(goBack());
    } else {
      dispatch(push(paths.games));
    }
  };

  scrollTopHandler = () => {
    if (window) {
      window.scrollTo(0, 0);
    }
  };

  pageScrollHandler = () => {
    if (typeof this.props.forceVisible === 'boolean') {
      return;
    }

    const { visible } = this.state;

    const scrollPoint = getScrollTop();
    const startPoint = this.startPoint || 100;

    if (scrollPoint >= startPoint && !visible) {
      this.setState({ visible: true });
    }

    if (scrollPoint < startPoint && visible) {
      this.setState({ visible: false });
    }
  };

  renderArrow() {
    const { isMainPage } = this.props;
    const className = cn('game-header__arrow-icon', {
      'game-header__arrow-icon_top': isMainPage,
    });

    return <SVGInline className={className} svg={arrowIcon} />;
  }

  render() {
    const { game, isMainPage, dispatch, currentUser, allRatings } = this.props;
    const { visible } = this.state;

    const className = cn({
      'game-header': true,
      'game-header_visible': visible,
      'game-header_main': isMainPage,
      'game-header_subpage': !isMainPage,
    });

    if (!game) return null;

    return (
      <div className={className}>
        <div className="game-header__wrapper">
          <GameCardCompact
            key={game.id}
            game={game}
            dispatch={dispatch}
            currentUser={currentUser}
            size="medium"
            onClick={isMainPage ? this.scrollTopHandler : undefined}
            icon={this.renderArrow()}
            allRatings={allRatings}
          />
          <ul className="game-header__right">{this.getInfo()}</ul>
        </div>
      </div>
    );
  }
}

export default GameHeader;
