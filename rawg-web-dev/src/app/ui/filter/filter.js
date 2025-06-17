/* eslint-disable camelcase */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { injectIntl } from 'react-intl';
import compact from 'lodash/compact';
import memoize from 'fast-memoize';

import clone from 'ramda/src/clone';
import equals from 'ramda/src/equals';

import appHelper from 'app/pages/app/app.helper';
import { appSizeType } from 'app/pages/app/app.types';
import intlShape from 'tools/prop-types/intl-shape';

import Select from 'app/ui/select';

import './filter.styl';

const filterClean = 'shared.filter_clean';

export const filterPropTypes = {
  intl: intlShape.isRequired,
  size: appSizeType.isRequired,
  content: PropTypes.shape({
    platforms: PropTypes.array,
    stores: PropTypes.array,
    genres: PropTypes.array,
    years: PropTypes.array,
  }),
  button: PropTypes.element,
  disabled: PropTypes.bool,
  onChange: PropTypes.func,
  className: PropTypes.string,
  filter: PropTypes.shape(),
  enableSortByUserRating: PropTypes.bool,
  enableSortByRating: PropTypes.bool,
  linkable: PropTypes.oneOfType([PropTypes.bool, PropTypes.string]),
  urlBase: PropTypes.string,
};

const componentDefaultProperties = {
  content: {
    platforms: [],
    stores: [],
    genres: [],
    years: [],
  },
  button: null,
  disabled: false,
  onChange: () => {},
  className: '',
  filter: {},
  enableSortByUserRating: false,
  enableSortByRating: false,
  linkable: false,
  urlBase: undefined,
};

@injectIntl
export default class Filter extends Component {
  static propTypes = filterPropTypes;

  static defaultProps = componentDefaultProperties;

  constructor(props) {
    super(props);

    this.state = {
      filters: props.filter || {},
    };

    this.handleChange = memoize(this.handleChange);
  }

  componentDidUpdate(previousProperties) {
    if (previousProperties.filter !== this.props.filter) {
      this.state.filters = this.props.filter;
    }
  }

  getOrderingContent() {
    const { intl, enableSortByUserRating, enableSortByRating } = this.props;
    const { ordering: filterOrdering = [] } = this.state.filters;

    return {
      title: intl.formatMessage({ id: 'shared.filter_order' }),
      items: compact([
        {
          id: '-created',
          value: intl.formatMessage({ id: 'shared.filter_order_date_added' }),
          collection: 'ordering',
          active: filterOrdering.some(equals('-created')),
        },
        {
          id: 'name',
          value: intl.formatMessage({ id: 'shared.filter_order_name' }),
          collection: 'ordering',
          active: filterOrdering.some(equals('name')),
        },
        {
          id: '-released',
          value: intl.formatMessage({ id: 'shared.filter_order_date' }),
          collection: 'ordering',
          active: filterOrdering.some(equals('-released')),
        },
        {
          id: '-added',
          value: intl.formatMessage({ id: 'shared.filter_order_popularity' }),
          collection: 'ordering',
          active: filterOrdering.some(equals('-added')),
        },
        enableSortByUserRating && {
          id: '-usergame__rating',
          value: intl.formatMessage({ id: 'shared.filter_order_rating' }),
          collection: 'ordering',
          active: filterOrdering.some(equals('-usergame__rating')),
        },
        enableSortByRating && {
          id: '-rating',
          value: intl.formatMessage({ id: 'shared.filter_order_rating' }),
          collection: 'ordering',
          active: filterOrdering.some(equals('-rating')),
        },
      ]),
    };
  }

  getPlatformsContent() {
    const {
      intl,
      content: { platforms = [] },
    } = this.props;
    const { platforms: filterPlatforms = [] } = this.state.filters;
    const { parent_platforms: filterParentPlatforms = [] } = this.state.filters;

    return {
      title: intl.formatMessage({ id: 'shared.filter_platforms' }),
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
            active: filterParentPlatforms.some((platformId) => platformId === id),
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
                    active: filterPlatforms.some((platformId) => platformId === childPltfrm.id),
                  })),
          };
        }),
      ],
    };
  }

  getStoresContent() {
    const {
      intl,
      content: { stores = [] },
    } = this.props;
    const { stores: filterStores = [] } = this.state.filters;

    return {
      title: intl.formatMessage({ id: 'shared.filter_stores' }),
      items: [
        {
          id: null,
          value: intl.formatMessage({ id: filterClean }),
          clean: true,
          collection: 'stores',
        },
        ...compact(
          stores.map((item) => {
            const sItem = item.store || item;
            const { id, slug, name, empty, nofollow } = sItem;

            return {
              id,
              value: name,
              slug,
              empty,
              nofollow,
              collection: 'stores',
              active: Boolean(filterStores.find((storeId) => storeId === id)),
            };
          }),
        ),
      ],
    };
  }

  getGenresContent() {
    const {
      intl,
      content: { genres = [] },
    } = this.props;
    const { genres: filterGenres = [] } = this.state.filters;

    return {
      title: intl.formatMessage({ id: 'shared.filter_genres' }),
      items: [
        {
          id: null,
          value: intl.formatMessage({ id: filterClean }),
          clean: true,
          collection: 'genres',
        },
        ...genres.map((item) => {
          const sItem = item.genre || item;
          const { id, slug, name, empty, nofollow } = sItem;
          return {
            id,
            value: name,
            slug,
            empty,
            nofollow,
            collection: 'genres',
            active: Boolean(filterGenres.find((genreId) => genreId === id)),
          };
        }),
      ],
    };
  }

  getYearsContent() {
    const {
      intl,
      content: { years = [] },
    } = this.props;
    const { dates: filterYears = [] } = this.state.filters;
    const filterYearsArray = Array.isArray(filterYears) && filterYears.length > 0 ? filterYears[0].split('.') : [];

    return {
      title: intl.formatMessage({ id: 'shared.filter_dates' }),
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
          active: filterYearsArray.some((year) => year === decade.filter),
          childs: decade.years.map(({ year, empty, nofollow }) => ({
            id: `${year}-01-01,${year}-12-31`,
            value: year.toString(),
            slug: year.toString(),
            empty,
            nofollow,
            collection: 'years',
            active: filterYearsArray.some((yr) => yr === `${year}-01-01,${year}-12-31`),
          })),
        })),
      ],
    };
  }

  getClassName() {
    const { className, disabled } = this.props;

    return classnames('filter', {
      filter_disabled: disabled,
      [className]: className,
    });
  }

  /* eslint-disable-next-line react/sort-comp */
  handleChange = (name) => (activeItems, isClean = false) => {
    const { onChange } = this.props;
    const values = activeItems.map((item) => item.id);
    const isPlatformsChagne = ['parent_platforms', 'platforms'].includes(name);

    const { filters } = this.state;
    const newFilters = clone(filters);

    if (isClean && isPlatformsChagne) {
      delete newFilters.platforms;
      delete newFilters.parent_platforms;
    } else if (values.length > 0) {
      newFilters[name] = values;

      if (name === 'parent_platforms') {
        // Если пользователь выбрал родительскую платформу -
        // автоматом очистим выбранные ранее подплатформы
        delete newFilters.platforms;
      } else if (name === 'platforms') {
        // И наоборот: если пользователь выбрал подплатформу -
        // автоматом очистим выбранные ранее родительские платформы
        delete newFilters.parent_platforms;
      }
    } else if (filters[name]) {
      delete newFilters[name];
    }

    if (Array.isArray(filters.dates) && filters.dates.length > 0) {
      newFilters.dates = [filters.dates.join('.')];
    }

    this.setState({ filters: newFilters });

    onChange(newFilters);
  };

  renderSelect = ({
    placeholder,
    content,
    buttonValue = '',
    multiple,
    onChange = () => {},
    onChangeChild = undefined,
  }) => {
    const { size, linkable, urlBase } = this.props;
    return (
      <Select
        button={{ className: 'filter-button', kind: 'inline', placeholder }}
        buttonValue={buttonValue}
        content={{ className: 'filter-content', ...content }}
        multiple={multiple}
        className="filter__select"
        onChange={onChange}
        onChangeChild={onChangeChild}
        closeOnClick={appHelper.isPhoneSize({ size })}
        kind="filter"
        closeOnScroll
        linkable={linkable}
        urlBase={urlBase}
        filters={this.state.filters}
        useOnlyButtonValue
      />
    );
  };

  render() {
    const { intl, linkable, button = null } = this.props;
    const { ordering, platforms, parent_platforms, stores, genres, dates } = this.state.filters;

    const orderingContent = this.getOrderingContent();
    const orderingValue = ordering ? (orderingContent.items.find((item) => item.id === ordering[0]) || {}).value : '';
    const platformsContent = this.getPlatformsContent();
    const platformsValue = platforms || parent_platforms ? platformsContent.title : '';
    const storesContent = this.getStoresContent();
    const storesValue = stores ? storesContent.title : '';
    const genresContent = this.getGenresContent();
    const genresValue = genres ? genresContent.title : '';
    const yearsContent = this.getYearsContent();
    const yearsValue = dates ? yearsContent.title : '';

    return (
      <div className={this.getClassName()}>
        <div className="filter__group filter__group_disabled">
          {this.renderSelect({
            placeholder: intl.formatMessage({ id: 'shared.filter_order' }),
            content: orderingContent,
            buttonValue: orderingValue,
            onChange: this.handleChange('ordering'),
          })}
        </div>
        <div className="filter__group">
          <div className="filter__group filter__group_disabled">
            {this.renderSelect({
              placeholder: intl.formatMessage({ id: 'shared.filter_platforms' }),
              content: platformsContent,
              buttonValue: platformsValue,
              multiple: !linkable,
              onChange: this.handleChange('parent_platforms'),
              onChangeChild: this.handleChange('platforms'),
            })}
            {this.renderSelect({
              placeholder: intl.formatMessage({ id: 'shared.filter_stores' }),
              content: storesContent,
              buttonValue: storesValue,
              multiple: !linkable,
              onChange: this.handleChange('stores'),
            })}
            {this.renderSelect({
              placeholder: intl.formatMessage({ id: 'shared.filter_genres' }),
              content: genresContent,
              buttonValue: genresValue,
              multiple: !linkable,
              onChange: this.handleChange('genres'),
            })}
            {this.renderSelect({
              placeholder: intl.formatMessage({ id: 'shared.filter_dates' }),
              content: yearsContent,
              buttonValue: yearsValue,
              multiple: true,
              onChange: this.handleChange('dates'),
              onChangeChild: this.handleChange('dates'),
            })}
          </div>
          {button}
        </div>
      </div>
    );
  }
}
