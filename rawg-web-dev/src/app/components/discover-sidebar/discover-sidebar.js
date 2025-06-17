/* eslint-disable camelcase */

import React, { Component } from 'react';
import { connect } from 'react-redux';
import { Link } from 'app/components/link';
import { push } from 'react-router-redux';
import { denormalize } from 'normalizr';
import { hot } from 'react-hot-loader/root';
import { injectIntl } from 'react-intl';
import SVGInline from 'react-svg-inline';
import PropTypes from 'prop-types';
import cn from 'classnames';
import StickyBox from 'react-sticky-box';
import memoize from 'fast-memoize';

import find from 'lodash/find';
import take from 'lodash/take';
import isFinite from 'lodash/isFinite';
import isString from 'lodash/isString';
import clone from 'lodash/clone';
import debounce from 'lodash/debounce';
import get from 'lodash/get';
import startsWith from 'lodash/startsWith';

import paths from 'config/paths';

import getScrollContainer from 'tools/get-scroll-container';
import getScrollTop from 'tools/get-scroll-top';

import trans from 'tools/trans';
import len from 'tools/array/len';
import resize from 'tools/img/resize';
import id from 'tools/id';

import intlShape from 'tools/prop-types/intl-shape';
import denormalizeGame from 'tools/redux/denormalize-game';

import Schemas from 'redux-logic/schemas';

import InputSearch from 'app/ui/input-search';

import { loadDiscoverSearch } from 'app/pages/discover/discover.actions';
import Avatar from 'app/ui/avatar';
import CloseButton from 'app/ui/close-button';
import Heading from 'app/ui/heading';
import DiscoverSharing from 'app/ui/discover-sharing';

import currentUserType from 'app/components/current-user/current-user.types';

import menuIcon from 'assets/icons/menu.svg';
// import moreIcon from 'assets/icons/more.svg';
// import arrowIcon from 'assets/icons/arrow-down.svg';
import arrowRightIcon from 'assets/icons/arrow.svg';

import { itemsPaths } from 'app/pages/discover/pages/search/search.helpers';

import BannerAdfox from 'app/pages/app/components/banner-adfox/banner-adfox';
import { newReleases, top, user, platforms, genres, browse, getAllSections } from './discover-sidebar.helpers';

import './discover-sidebar.styl';
import gameType from '../../pages/game/game.types';
import GameAuthorization from '../game-authorization/game-authorization';

const sidebarSearchActive = false;

@hot
@connect((state) => {
  return {
    game: denormalizeGame(state),
    isSpider: state.app.request.isSpider,
    currentUser: state.currentUser,
    followings: denormalize(state.discover.followings.items, Schemas.DISCOVER_FOLLOWINGS_ARRAY, state.entities),
    recommended: state.discover.recommended,
    lastPlayed: state.discover.lastPlayed,
  };
})
@injectIntl
class Sidebar extends Component {
  static propTypes = {
    game: gameType.isRequired,
    isSpider: PropTypes.bool.isRequired,
    pathname: PropTypes.string.isRequired,
    currentUser: currentUserType.isRequired,
    isPhoneSize: PropTypes.bool.isRequired,
    dispatch: PropTypes.func.isRequired,
    searchPage: PropTypes.bool,
    needControls: PropTypes.bool,
    onlyOnPhone: PropTypes.bool,
    heading: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
    hideHeading: PropTypes.bool,
    followings: PropTypes.arrayOf(PropTypes.shape()).isRequired,
    intl: intlShape.isRequired,
    offsetTop: PropTypes.number,
    recommended: PropTypes.array,
    lastPlayed: PropTypes.array,
  };

  static defaultProps = {
    searchPage: false,
    needControls: false,
    onlyOnPhone: true,
    heading: undefined,
    hideHeading: false,
    offsetTop: 0,
  };

  constructor(...arguments_) {
    super(...arguments_);

    this.mobileNavigation = React.createRef();
    this.activeItem = React.createRef();

    this.state = {
      opened: false,
      visible: false,
      openedLists: {},
      gameInViewport: true,
    };

    this.toggleOpen = memoize(this.toggleOpen);
  }

  componentDidMount() {
    this.scrollToItem();

    getScrollContainer().addEventListener('scroll', this.pageScrollHandler);
    document.addEventListener('game-in-viewport', this.onGameInViewport);
  }

  componentDidUpdate(previousProperties) {
    if (previousProperties.pathname !== this.props.pathname) {
      this.scrollToItem();
    }
  }

  componentWillUnmount() {
    getScrollContainer().removeEventListener('scroll', this.pageScrollHandler);
    document.removeEventListener('game-in-viewport', this.onGameInViewport);
  }

  onGameInViewport = (event) => {
    this.setState((state) => {
      return {
        ...state,
        gameInViewport: event.detail,
      };
    });
  };

  onSearchClick = () => {
    const { dispatch } = this.props;

    dispatch(push(paths.search()));
  };

  onSearch = debounce((query) => {
    const { dispatch } = this.props;

    dispatch(loadDiscoverSearch({ query }));
  }, 500);

  getActiveLabel() {
    const { currentUser, heading, hideHeading } = this.props;
    const allSections = getAllSections(currentUser);
    const activeSection = find(allSections, this.isActive);

    if ((!activeSection && !heading) || hideHeading) return null;

    return (
      <>
        <Heading className="discover-sidebar__heading" rank={1}>
          {heading || this.renderItemContent(activeSection)}
          {/* <SVGInline svg={arrowIcon} className="discover-sidebar__arrow-icon" /> */}
        </Heading>
        {activeSection && activeSection.subtitle && <p className="discover__subtitle">{activeSection.subtitle}</p>}
      </>
    );
  }

  openMenuHandler = () => {
    this.setState({ opened: true });
  };

  closeMenuHandler = () => {
    this.setState({ opened: false });
  };

  scrollToItem = () => {
    const mobileNavigation = this.mobileNavigation.current;
    const activeItem = this.activeItem.current;

    if (mobileNavigation && mobileNavigation.scrollTo && activeItem) {
      const { left } = activeItem.getBoundingClientRect();

      mobileNavigation.scrollTo(mobileNavigation.scrollLeft + left, 0);
    }
  };

  pageScrollHandler = () => {
    const { visible } = this.state;
    const scrollPoint = getScrollTop();
    const startPoint = 350;

    if (scrollPoint >= startPoint && !visible) {
      this.setState({ visible: true });
    }

    if (scrollPoint < startPoint && visible) {
      this.setState({ visible: false });
    }
  };

  toggleOpen = (title) => () => {
    this.setState((state) => {
      const opened = state.openedLists[title] === true;
      const openedLists = clone(state.openedLists);

      openedLists[title] = !opened;

      return { openedLists };
    });
  };

  isActive = (item) => {
    const { pathname } = this.props;

    if (item.path === '/') {
      return pathname === item.path;
    }

    return pathname === item.path;
  };

  renderUser() {
    const { currentUser, isPhoneSize } = this.props;
    const { username, avatar } = currentUser;

    return (
      <Link className="discover-sidebar__user" to={paths.profile(currentUser.slug)}>
        <span className="discover-sidebar__username">{username}</span>
        <Avatar size={isPhoneSize ? 24 : 36} src={avatar} profile={currentUser} />
      </Link>
    );
  }

  renderItemContent(item) {
    return (
      <>
        {item.image && (
          <img className="discover-sidebar__image" src={resize(80, item.image)} alt={item.name} title={item.name} />
        )}
        {item.icon && (
          <SVGInline
            className={cn('discover-sidebar__icon', {
              [`discover-sidebar__icon_${item.iconClassName}`]: item.iconClassName,
            })}
            svg={item.icon}
          />
        )}
        <span className="discover-sidebar__label">{item.name}</span>
      </>
    );
  }

  renderItem = (item, idx) => {
    const { isPhoneSize } = this.props;
    const isActive = this.isActive(item);
    const itemClassName = cn('discover-sidebar__link', {
      'discover-sidebar__link_active': isActive,
    });

    return (
      // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
      <li
        onClick={item.onClick ? item.onClick : undefined}
        className="discover-sidebar__item"
        key={`${idx}.${item.key}`}
        ref={isActive ? this.activeItem : undefined}
      >
        {isActive ? (
          <div className={itemClassName}>{this.renderItemContent(item)}</div>
        ) : (
          <Link className={itemClassName} to={item.path} onClick={isPhoneSize ? this.closeMenuHandler : undefined}>
            {this.renderItemContent(item)}
          </Link>
        )}
      </li>
    );
  };

  renderToggleBtn(title, opened) {
    return (
      <li className="discover-sidebar__item" key="toggle-show-all">
        <div
          className={cn('discover-sidebar__link', 'discover-sidebar__link_toggle', {
            'discover-sidebar__link_toggle-opened': opened,
            'discover-sidebar__link_toggle-collapsed': !opened,
          })}
          onClick={this.toggleOpen(title)}
          role="button"
          tabIndex={0}
        >
          {this.renderItemContent({
            icon: arrowRightIcon,
            name: trans(opened ? 'discover.collapse' : 'discover.show-all'),
            key: opened ? 'discover.collapse' : 'discover.show-all',
          })}
        </div>
      </li>
    );
  }

  renderMenuList(collapsedCount, title, itemsArgument, headerPath, checkActive = true) {
    const opened = this.state.openedLists[title] === true;
    const showAll = opened || collapsedCount === false;
    const hasActive = checkActive ? (itemsArgument || []).some(this.isActive) : false;

    const items = showAll || hasActive ? itemsArgument : take(itemsArgument, collapsedCount);
    const HeaderTag = headerPath ? Link : 'span';
    const itemsLength = len(itemsArgument);
    const showToggle = !hasActive && isFinite(collapsedCount) && collapsedCount < itemsLength;

    if (itemsArgument !== undefined && itemsLength === 0) {
      return null;
    }

    return (
      <div className="discover-sidebar__menu">
        <HeaderTag to={headerPath} className="discover-sidebar__title">
          {isString(title) && trans(title)}
          {!isString(title) && title}
        </HeaderTag>
        <ul className="discover-sidebar__list">
          {items && items.map(this.renderItem)}
          {showToggle && this.renderToggleBtn(title, opened)}
        </ul>
      </div>
    );
  }

  renderFollowings() {
    const { followings, currentUser } = this.props;

    if (!currentUser.id) {
      return null;
    }

    const items = followings.map(
      ({ slug, name, full_name, username, image, game_background, instance, image_background }) => ({
        key: `${instance}-${slug}`,
        name: name || full_name || username,
        image: image || get(game_background, 'url') || image_background,
        path: itemsPaths[instance](slug),
      }),
    );

    return this.renderMenuList(3, 'discover.followings', items, undefined, false);
  }

  renderHome() {
    return this.renderMenuList(false, 'discover.main', undefined, paths.index);
  }

  renderReviews() {
    return this.renderMenuList(false, 'discover.reviews', undefined, paths.reviewsBest);
  }

  renderAllGames() {
    return this.renderMenuList(false, 'discover.all-games', undefined, paths.games);
  }

  renderLastPlayed() {
    const { lastPlayed = [] } = this.props;

    const items = lastPlayed.map(({ name, image, slug }) => {
      const output = {
        key: `last_played-${slug}`,
        name,
        path: `/games/${slug}`,
        onClick() {
          if (typeof window.yaCounter === 'object') {
            window.yaCounter.reachGoal('SidebarRecentGames');
          }

          if (window.gtag) {
            window.gtag('event', 'recommendation_click', {
              game_title: name,
              source: 'sidebar_recent',
            });
          }
        },
      };

      if (image) {
        output.image = image;
      } else {
        output.icon = ' ';
      }

      return output;
    });

    // if (recommended.length > 0) {
    //   items.push({
    //     key: 'recommended-all',
    //     name: 'Все игры',
    //     icon: moreIcon,
    //     path: '/games',
    //   });
    // }

    return this.renderMenuList(false, 'discover.last_played', items, false);
  }

  renderRecommended() {
    const { recommended = [] } = this.props;

    const items = recommended.map(({ name, image, slug }) => {
      const output = {
        key: `recommended-${slug}`,
        name,
        path: `/games/${slug}`,
        onClick() {
          if (typeof window.yaCounter === 'object') {
            window.yaCounter.reachGoal('SidebarRecommendedGames');
          }

          if (window.gtag) {
            window.gtag('event', 'recommendation_click', {
              game_title: name,
              source: 'sidebar_recommended',
            });
          }
        },
      };

      if (image) {
        output.image = image;
      } else {
        output.icon = ' ';
      }

      return output;
    });

    // if (recommended.length > 0) {
    //   items.push({
    //     key: 'recommended-all',
    //     name: 'Все игры',
    //     icon: moreIcon,
    //     path: '/games',
    //   });
    // }

    return this.renderMenuList(false, 'discover.recommended', items, false);
  }

  renderNavigation(type) {
    const { currentUser, game, pathname } = this.props;
    const className = cn('discover-sidebar__nav', `discover-sidebar__nav_${type}`);

    return (
      <>
        <nav className={className}>
          {this.renderHome()}
          {type !== 'mobile' ? this.renderLastPlayed() : this.renderReviews()}

          <div className="discover-sidebar__nav__elements">
            {this.renderFollowings()}
            {currentUser.id && this.renderMenuList(false, this.renderUser(), user)}

            {type !== 'mobile' && (
              <>
                {this.renderRecommended()}
                {this.renderReviews()}
              </>
            )}

            {this.renderMenuList(false, 'discover.new_releases', newReleases)}
            {type === 'mobile' && (
              <>
                {this.renderLastPlayed()}
                {this.renderRecommended()}
              </>
            )}

            {this.renderMenuList(false, 'discover.top', top)}
            {pathname.startsWith('/games/') && !game.iframe_url && <BannerAdfox type="240x400" />}
            <br />
            <br />
            {this.renderAllGames()}
            {this.renderMenuList(3, 'discover.browse', browse, paths.gamesBrowse)}
            {this.renderMenuList(3, 'discover.platforms', platforms, paths.platforms)}
            {this.renderMenuList(3, 'discover.genres', genres, paths.genres)}
            {type === 'mobile' && (
              <CloseButton className="discover-sidebar__nav-close" onClick={this.closeMenuHandler} />
            )}
          </div>
        </nav>
      </>
    );
  }

  renderSearchInput() {
    const { searchPage, intl } = this.props;

    if (searchPage || !sidebarSearchActive) {
      return null;
    }

    return (
      <InputSearch
        className="discover-sidebar__search-input"
        placeholder={intl.formatMessage(id('search.search_page_input_placeholder'))}
        onChange={this.onSearch}
        containerProperties={{
          onClick: this.onSearchClick,
          role: 'button',
          tabIndex: 0,
        }}
      />
    );
  }

  renderMobileHeading(heading) {
    return <div className="discover-sidebar__heading-mobile-menu">{heading}</div>;
  }

  renderMobileNavigation() {
    const { currentUser } = this.props;
    const allSections = getAllSections(currentUser);

    return (
      <nav className="discover-sidebar__mobile-nav" ref={this.mobileNavigation}>
        <ul className="discover-sidebar__list">{allSections.map(this.renderItem)}</ul>
      </nav>
    );
  }

  renderMenuButton() {
    return (
      <div className="discover-sidebar__menu-button-wrapper">
        <div className="discover-sidebar__menu-button" onClick={this.openMenuHandler} role="button" tabIndex="0">
          <SVGInline svg={menuIcon} className="discover-sidebar__menu-button-icon" />
        </div>
      </div>
    );
  }

  renderAuthorization() {
    const { currentUser, game, pathname } = this.props;

    if (!game || !game.iframe_url || !pathname.startsWith('/games/') || currentUser.id) {
      return null;
    }

    let isHidden = false;

    if (!this.state.gameInViewport) {
      isHidden = true;
    }

    return <GameAuthorization isHidden={isHidden} isSidebar name={game.name} />;
  }

  renderMobile() {
    const { pathname, needControls, isSpider } = this.props;
    const { opened, visible } = this.state;
    const heading = this.getActiveLabel();
    const wrapperClassName = cn('discover-sidebar__wrapper', {
      'discover-sidebar__wrapper_visible': visible || isSpider,
    });

    return (
      <div className="discover__sidebar discover__sidebar_mobile">
        {pathname !== '/' && !!heading && this.renderMobileHeading(heading)}
        {needControls && (
          <div className="discover__sidebar-controls">{pathname && <DiscoverSharing url={pathname} />}</div>
        )}
        <aside className={wrapperClassName}>
          {this.renderMobileNavigation()}
          {this.renderMenuButton()}
        </aside>
        {opened && this.renderNavigation('mobile')}
      </div>
    );
  }

  renderDesktop() {
    const { onlyOnPhone, offsetTop } = this.props;

    if (onlyOnPhone) {
      return null;
    }

    return (
      <div className="discover-sidebar__container">
        {this.renderAuthorization()}

        <StickyBox offsetTop={offsetTop} offsetBottom={0}>
          <aside className="discover__sidebar discover__sidebar_desktop">
            {this.renderSearchInput()}
            {this.renderNavigation('desktop')}
          </aside>
        </StickyBox>
      </div>
    );
  }

  render() {
    const { isPhoneSize } = this.props;

    return isPhoneSize ? this.renderMobile() : this.renderDesktop();
  }
}

export default Sidebar;
