import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import Filter from 'app/ui/filter';
import { appSizeType } from 'app/pages/app/app.types';

import getScrollContainer from 'tools/get-scroll-container';

import { maybeMarkFilters } from './filter-wrapper.lib';

import '../../games.styl';

const propTypes = {
  filter: PropTypes.shape({}).isRequired,
  size: appSizeType.isRequired,
  platforms: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  stores: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  genres: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  years: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
};

@connect((state) => ({
  size: state.app.size,
  ...maybeMarkFilters(
    {
      genres: state.app.genres,
      stores: state.app.stores,
      platforms: state.games.platforms,
      years: state.games.years,
    },
    state.games.games.filters,
  ),
}))
class FilterWrapper extends Component {
  static propTypes = propTypes;

  constructor(props) {
    super(props);

    this.filterRef = React.createRef();
  }

  componentDidMount() {
    getScrollContainer().addEventListener('scroll', this.scrollHandler);
  }

  componentWillUnmount() {
    getScrollContainer().removeEventListener('scroll', this.scrollHandler);
  }

  scrollHandler = () => {
    const { current } = this.filterRef;

    if (current) {
      const { top } = current.getBoundingClientRect();

      if (top <= 0) {
        current.classList.add('games__filter_top');
      } else {
        current.classList.remove('games__filter_top');
      }
    }
  };

  render() {
    const { filter, size, platforms, stores, genres, years } = this.props;

    return (
      <div className="games__filter" ref={this.filterRef}>
        <div className="games__filter-inner">
          <Filter
            enableSortByRating
            filter={filter}
            size={size}
            content={{
              platforms,
              stores,
              genres,
              years,
            }}
            linkable
          />
        </div>
      </div>
    );
  }
}

export default FilterWrapper;
