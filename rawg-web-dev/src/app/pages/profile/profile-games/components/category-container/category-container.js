import React, { Component } from 'react';
import PropTypes from 'prop-types';
import cn from 'classnames';
import { Collapse } from 'react-collapse';

import profileGamesStorage from 'app/pages/profile/profile-games/profile-games.storage';

import trans from 'tools/trans';

import './category-container.styl';

const springConfig = {
  stiffness: 150,
  damping: 20,
  precision: 0.01,
};

const componentPropertyTypes = {
  className: PropTypes.string,
  onClick: PropTypes.func,
  isOpened: PropTypes.bool,
  children: PropTypes.func.isRequired,
  category: PropTypes.string.isRequired,
  counter: PropTypes.number.isRequired,
  isCurrentUser: PropTypes.bool.isRequired,
  searchValue: PropTypes.string,
  categorizedGamesCount: PropTypes.number,
};

const defaultProps = {
  className: '',
  isOpened: false,
  onClick: () => {},
  searchValue: '',
  categorizedGamesCount: 0,
};

class CategoryContainer extends Component {
  static propTypes = componentPropertyTypes;

  constructor(props) {
    super(props);

    this.state = {
      opened: this.props.isOpened && this.props.counter > 0,
      prevSearchValue: this.props.searchValue,
      prevCounter: this.props.counter,
    };
  }

  static getDerivedStateFromProps(props, state) {
    if (
      props.searchValue &&
      state.prevSearchValue !== props.searchValue &&
      props.counter > 0 &&
      state.prevCounter !== props.counter &&
      state.opened === false
    ) {
      return {
        prevSearchValue: props.searchValue,
        prevCounter: props.counter,
        opened: true,
      };
    }

    if (
      props.counter > 0 &&
      state.prevCounter !== props.counter &&
      (props.isOpened === true || props.searchValue) &&
      state.opened === false
    ) {
      return {
        prevCounter: props.counter,
        opened: true,
      };
    }

    if (props.counter === 0 && state.opened === true) {
      return {
        prevCounter: props.counter,
        opened: false,
      };
    }

    if (state.prevCounter !== props.counter || state.prevSearchValue !== props.searchValue) {
      return {
        prevCounter: props.counter,
        prevSearchValue: props.searchValue,
      };
    }

    if (props.isCurrentUser) {
      const categories = profileGamesStorage.get();

      if (categories.includes(props.category) && !state.opened && props.counter > 0) {
        return { opened: true };
      }

      if (!categories.includes(props.category) && state.opened) {
        return { opened: false };
      }
    }

    return null;
  }

  handleClick = () => {
    const { onClick, counter, category, isCurrentUser } = this.props;
    const available = !!counter;

    if (available) {
      this.setState(({ opened }) => ({ opened: !opened }));

      if (isCurrentUser) {
        profileGamesStorage.toggle(category);
      }

      if (typeof onClick === 'function') {
        onClick();
      }
    }
  };

  getOwnedCategoryTitle = () => {
    const { categorizedGamesCount } = this.props;

    return categorizedGamesCount ? trans('profile.category_owned') : trans('profile.category_owned_all_games');
  };

  render() {
    const { className, children, category, counter } = this.props;
    const { opened } = this.state;

    const emojies = {
      owned: <div className="category-container__icon category-container__icon_owned" />,
      playing: <div className="category-container__icon category-container__icon_playing" />,
      beaten: <div className="category-container__icon category-container__icon_beaten" />,
      dropped: <div className="category-container__icon category-container__icon_dropped" />,
      yet: <div className="category-container__icon category-container__icon_yet" />,
    };

    const available = !!counter;
    const unavailable = !counter;

    const title =
      category === 'owned' ? this.getOwnedCategoryTitle() : trans(`profile.category_${category}`, { counter });

    return (
      <div
        className={cn('category-container', className, {
          available,
          unavailable,
          opened,
        })}
      >
        <div className="category-container__header" onClick={this.handleClick} role="button" tabIndex={0}>
          <span className="category-container__emoji" role="img" aria-label={category}>
            {emojies[category]}
          </span>
          <h4 className="category-container__title">{title}</h4>
          <div
            className={cn('category-container__arrow-icon', {
              'category-container__arrow-icon_opened': opened,
            })}
          />
        </div>
        <div className="category-container__content">
          <Collapse springConfig={springConfig} forceInitialAnimation isOpened={opened}>
            {children({ opened })}
          </Collapse>
        </div>
      </div>
    );
  }
}

CategoryContainer.defaultProps = defaultProps;

export default CategoryContainer;
