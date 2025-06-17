/* eslint-disable camelcase */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import cn from 'classnames';
import { injectIntl } from 'react-intl';
import { withRouter } from 'react-router';
import { hot } from 'react-hot-loader/root';
import memoize from 'fast-memoize';
import compact from 'lodash/compact';

import noop from 'lodash/noop';
import isEqual from 'lodash/isEqual';
import isArray from 'lodash/isArray';
import head from 'lodash/head';
import find from 'lodash/find';
import concat from 'lodash/concat';

import prop from 'ramda/src/prop';
import propEq from 'ramda/src/propEq';
import equals from 'ramda/src/equals';
import clone from 'ramda/src/clone';

import firstValue from 'tools/array/first-value';
import len from 'tools/array/len';

import locationShape from 'tools/prop-types/location-shape';
import intlShape from 'tools/prop-types/intl-shape';

import Select from 'app/ui/select';
import SwitcherOnlyMyPlatforms from 'app/components/switcher-only-my-platforms';
import SwitcherOnlyPlatformExclusives from 'app/components/switcher-only-platform-exclusives';

import './discover-filter.styl';

const filterClean = 'shared.filter_clean';

const onlyPlatformExclusivesSwitcherEnabled = false;

export const sortTypes = {
  relevance: '-relevance',
  created: '-created',
  name: 'name',
  released: '-released',
  added: '-added',
  usergameRating: '-usergame__rating',
  rating: '-rating',
};

const propTypes = {
  intl: intlShape.isRequired,
  years: PropTypes.arrayOf(PropTypes.object),
  disabled: PropTypes.bool,
  dispatch: PropTypes.func.isRequired,
  onChange: PropTypes.func,
  className: PropTypes.string,
  filters: PropTypes.shape(),
  linkable: PropTypes.oneOfType([PropTypes.bool, PropTypes.string]),
  urlBase: PropTypes.string,
  platforms: PropTypes.arrayOf(PropTypes.object),
  location: locationShape.isRequired,
  enableSortByRelevance: PropTypes.bool,
  enableSortByUserRating: PropTypes.bool,
  enableSortByRating: PropTypes.bool,
  enableOrdering: PropTypes.bool,
  enableDatesFilter: PropTypes.bool,
  enablePlatformsFilter: PropTypes.bool,
  enableOnlyMyPlatformsFilter: PropTypes.bool,
  enableOnlyPlatformsExclusives: PropTypes.bool,
  showOnlyMyPlatforms: PropTypes.bool,
};

const defaultProps = {
  years: [],
  disabled: false,
  onChange: noop,
  className: '',
  filters: {},
  linkable: false,
  urlBase: undefined,
  platforms: undefined,
  enableSortByRelevance: false,
  enableSortByUserRating: false,
  enableSortByRating: false,
  enableOrdering: true,
  enableDatesFilter: true,
  enablePlatformsFilter: true,
  enableOnlyMyPlatformsFilter: false,
  enableOnlyPlatformsExclusives: false,
  showOnlyMyPlatforms: undefined,
};

@hot
@injectIntl
@withRouter
export default class DiscoverFilter extends Component {
  static propTypes = propTypes;

  static defaultProps = defaultProps;

  constructor(props) {
    super(props);

    this.state = {
      filters: props.filters || {},
    };

    this.handleChange = memoize(this.handleChange);
  }

  componentDidUpdate(previousProperties) {
    const equal = isEqual(previousProperties.filters, this.props.filters);

    if (!equal) {
      // eslint-disable-next-line react/no-did-update-set-state
      this.setState({ filters: this.props.filters });
    }
  }

  getOrderingContent() {
    const { ordering: filterOrdering = [] } = this.state.filters;
    const { intl, enableSortByUserRating, enableSortByRating, enableSortByRelevance } = this.props;

    const content = {
      title: '',
      active: false,
      items: compact([
        enableSortByRelevance && {
          id: sortTypes.relevance,
          value: intl.formatMessage({ id: 'shared.filter_order_relevance' }),
          collection: 'ordering',
          active: filterOrdering.some(equals(sortTypes.relevance)),
        },
        {
          id: sortTypes.created,
          value: intl.formatMessage({ id: 'shared.filter_order_date_added' }),
          collection: 'ordering',
          active: filterOrdering.some(equals(sortTypes.created)),
        },
        {
          id: sortTypes.name,
          value: intl.formatMessage({ id: 'shared.filter_order_name' }),
          collection: 'ordering',
          active: filterOrdering.some(equals(sortTypes.name)),
        },
        {
          id: sortTypes.released,
          value: intl.formatMessage({ id: 'shared.filter_order_date' }),
          collection: 'ordering',
          active: filterOrdering.some(equals(sortTypes.released)),
        },
        {
          id: sortTypes.added,
          value: intl.formatMessage({ id: 'shared.filter_order_popularity' }),
          collection: 'ordering',
          active: filterOrdering.some(equals(sortTypes.added)),
        },
        enableSortByUserRating && {
          id: sortTypes.usergameRating,
          value: intl.formatMessage({ id: 'shared.filter_order_rating' }),
          collection: 'ordering',
          active: filterOrdering.some(equals(sortTypes.usergameRating)),
        },
        enableSortByRating && {
          id: sortTypes.rating,
          value: intl.formatMessage({ id: 'shared.filter_order_rating' }),
          collection: 'ordering',
          active: filterOrdering.some(equals(sortTypes.rating)),
        },
      ]),
    };

    const orderingCurrentValue = head(filterOrdering);
    const orderItem = (content.items.find(propEq('id', orderingCurrentValue)) || {}).value;
    const orderFirstString = intl.formatMessage({ id: 'shared.filter_order' });

    const buttonValue = (
      <>
        {orderFirstString}: <span className="discover-filter-button__value">{orderItem}</span>
      </>
    );

    return { content, buttonValue };
  }

  getYearsContent() {
    const { intl, years, location } = this.props;
    const { dates: filterYears = [] } = this.state.filters;
    const yearFromPath = location.pathname.split('/').find((piece) => !!parseInt(piece, 10));
    const selectedYear = head(filterYears) || yearFromPath;

    const content = {
      title: '',
      active: len(filterYears) > 0,
      items: [
        {
          id: null,
          value: intl.formatMessage({ id: filterClean }),
          clean: true,
          collection: 'years',
        },
        ...years.map((decade) => ({
          id: decade.filter,
          value: `${decade.from}-${decade.to}`,
          slug: `${decade.from}-${decade.to}`,
          empty: decade.empty,
          nofollow: decade.nofollow,
          collection: 'years',
          active: selectedYear === decade.filter,
          childs: decade.years.map(({ year, empty, nofollow }) => ({
            id: `${year}-01-01,${year}-12-31`,
            value: year.toString(),
            slug: year.toString(),
            empty,
            nofollow,
            collection: 'years',
            active: selectedYear === `${year}-01-01,${year}-12-31`,
          })),
        })),
      ],
    };

    const buttonValue = selectedYear
      ? this.getSelectedYear(content.items, selectedYear, yearFromPath)
      : intl.formatMessage({ id: 'shared.filter_dates' });

    return { content, buttonValue };
  }

  getFilteredPlatform() {
    const { platforms } = this.props;
    const { platforms: filterPlatforms = [] } = this.state.filters;
    const { parent_platforms: filterParentPlatforms = [] } = this.state.filters;

    if (len(filterPlatforms) > 0) {
      const allChildPlatforms = concat(...platforms.map(prop('platforms')));
      return find(allChildPlatforms, propEq('id', head(filterPlatforms)));
    }

    if (len(filterParentPlatforms) > 0) {
      return find(platforms, propEq('id', head(filterParentPlatforms)));
    }

    return undefined;
  }

  getPlatformsContent() {
    const { intl, platforms } = this.props;
    const { platforms: filterPlatforms = [] } = this.state.filters;
    const { parent_platforms: filterParentPlatforms = [] } = this.state.filters;

    const filteredPlatform = this.getFilteredPlatform();

    const content = {
      title: intl.formatMessage({ id: 'shared.filter_platforms' }),
      active: len(filterPlatforms) > 0 || len(filterParentPlatforms) > 0,
      items: [
        {
          id: null,
          value: intl.formatMessage({ id: filterClean }),
          clean: true,
          collection: 'platforms',
        },
        ...platforms.map((platform) => {
          const sPlatform = platform.platform || platform;
          const { id, name, slug, empty, nofollow, platforms: childPlatforms = [] } = sPlatform;

          return {
            id,
            value: name,
            slug,
            empty,
            nofollow,
            collection: 'parent_platforms',
            active: filterParentPlatforms.some(equals(id)),
            childs:
              childPlatforms.length < 2
                ? undefined
                : childPlatforms.map((childPltfrm) => ({
                    id: childPltfrm.id,
                    value: childPltfrm.name,
                    slug: childPltfrm.slug,
                    empty: childPltfrm.empty,
                    nofollow: childPltfrm.nofollow,
                    collection: 'platforms',
                    active: filterPlatforms.some(equals(childPltfrm.id)),
                  })),
          };
        }),
      ],
    };

    const buttonValue = filteredPlatform ? filteredPlatform.name : content.title;

    return { buttonValue, content };
  }

  getSelectedYear(years, selected, yearFromPath) {
    const { intl } = this.props;
    const renderValue = (value) => (
      <>
        {intl.formatMessage({ id: 'shared.filter_dates' })}:{' '}
        <span className="discover-filter-button__value">{value}</span>
      </>
    );

    if (yearFromPath) {
      return renderValue(yearFromPath);
    }

    return firstValue((year) => {
      if (year.id === selected) {
        return renderValue(year.value);
      }

      if (isArray(year.childs)) {
        return firstValue((child) => {
          if (child.id === selected) {
            return renderValue(child.value);
          }
          return undefined;
        }, year.childs);
      }

      return undefined;
    }, years);
  }

  /* eslint-disable-next-line react/sort-comp */
  handleChange = (name) => (activeItems) => {
    const { onChange } = this.props;
    const values = activeItems.map((item) => item.id);

    const { filters } = this.state;
    const newFilters = clone(filters);

    if (values.length > 0) {
      newFilters[name] = values;
    } else if (filters[name]) {
      delete newFilters[name];
    }

    if (Array.isArray(filters.dates) && filters.dates.length > 0) {
      newFilters.dates = [filters.dates.join('.')];
    }

    this.setState({ filters: newFilters });

    onChange(newFilters);
  };

  renderSelect = ({ placeholder, content, buttonValue = '', multiple, onChange, onChangeChild }) => {
    const { linkable, urlBase } = this.props;
    const { active } = content;
    return (
      <Select
        button={{
          className: 'discover-filter-button',
          kind: 'inline',
          placeholder,
          active,
        }}
        buttonValue={buttonValue}
        content={{ className: 'discover-filter-content', ...content }}
        multiple={multiple}
        className="discover-filter__select"
        onChange={onChange}
        onChangeChild={onChangeChild}
        closeOnClick
        linkable={linkable}
        filters={this.state.filters}
        urlBase={urlBase}
        onlyArrow
        useOnlyButtonValue
        widthAsButton
      />
    );
  };

  renderOnlyMyPlatforms() {
    const { dispatch, showOnlyMyPlatforms } = this.props;

    return (
      <SwitcherOnlyMyPlatforms
        onlyMyPlatforms={showOnlyMyPlatforms}
        dispatch={dispatch}
        className="discover-filter__only-my-platforms"
      />
    );
  }

  renderOnlyPlatformExclusives() {
    const { location } = this.props;

    if (onlyPlatformExclusivesSwitcherEnabled) {
      return (
        <SwitcherOnlyPlatformExclusives className="discover-filter__only-platform-exclusives" location={location} />
      );
    }

    return null;
  }

  render() {
    const {
      className,
      disabled,
      enableOrdering,
      enableDatesFilter,
      enablePlatformsFilter,
      enableOnlyMyPlatformsFilter,
      enableOnlyPlatformsExclusives,
      platforms,
    } = this.props;

    return (
      <div className={cn('discover-filter', className, { filter_disabled: disabled })}>
        <div className="discover-filter__selects">
          {enableOrdering &&
            this.renderSelect({
              onChange: this.handleChange('ordering'),
              ...this.getOrderingContent(),
            })}
          {enableDatesFilter &&
            this.renderSelect({
              onChange: this.handleChange('dates'),
              onChangeChild: this.handleChange('dates'),
              ...this.getYearsContent(),
            })}
          {enablePlatformsFilter &&
            len(platforms) > 0 &&
            this.renderSelect({
              onChange: this.handleChange('parent_platforms'),
              onChangeChild: this.handleChange('platforms'),
              ...this.getPlatformsContent(),
            })}
        </div>
        {enableOnlyMyPlatformsFilter && this.renderOnlyMyPlatforms()}
        {enableOnlyPlatformsExclusives && this.renderOnlyPlatformExclusives()}
      </div>
    );
  }
}
