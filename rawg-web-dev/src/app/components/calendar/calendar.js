import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { hot } from 'react-hot-loader/root';
import { FormattedMessage, FormattedDate } from 'react-intl';
import { withRouter } from 'react-router';

import head from 'lodash/head';
import get from 'lodash/get';

import evolve from 'ramda/src/evolve';
import not from 'ramda/src/not';
import propEq from 'ramda/src/propEq';

import paths from 'config/paths';

import denormalizeGamesArr from 'tools/redux/denormalize-games-arr';
import locationShape from 'tools/prop-types/location-shape';
import getUrlWidthQuery from 'tools/get-url-with-query';
import { pageView } from 'scripts/analytics-helper';

import { DISCOVER_SEC_CALENDAR } from 'app/pages/discover/discover.sections';

import EmptyList from 'app/ui/empty-list';
import DiscoverGamesList from 'app/components/discover-games-list';

import { loadCalendar } from 'app/components/calendar/calendar.actions';

import { getDatesWithNextYear } from 'tools/dates/get-dates';

import './calendar.styl';

import ToggleButton from 'app/ui/toggle-button/toggle-button';
import SimpleIntlMessage from 'app/components/simple-intl-message/simple-intl-message';
import CalendarMonths from 'app/ui/calendar-months';

const section = DISCOVER_SEC_CALENDAR;

@hot
@withRouter
@connect((state) => ({
  calendar: state.calendar,
  items: denormalizeGamesArr(state, 'calendar.items'),
  currentUser: state.currentUser,
  allRatings: state.app.ratings,
}))
export default class Calendar extends Component {
  static propTypes = {
    month: PropTypes.number.isRequired,
    year: PropTypes.number.isRequired,
    calendar: PropTypes.shape({
      loading: PropTypes.bool,
      loaded: PropTypes.bool,
      count: PropTypes.number,
      next: PropTypes.string,
      previous: PropTypes.string,
      items: PropTypes.arrayOf(PropTypes.string),
      platforms: PropTypes.arrayOf(PropTypes.object),
      months: PropTypes.arrayOf(
        PropTypes.shape({
          current: PropTypes.bool,
          month: PropTypes.number,
          year: PropTypes.number,
        }),
      ),
    }).isRequired,
    items: PropTypes.arrayOf(PropTypes.shape()).isRequired,
    dispatch: PropTypes.func.isRequired,
    location: locationShape.isRequired,
  };

  static defaultProps = {
    //
  };

  constructor(properties, context) {
    super(properties, context);

    this.state = {
      popularOnly: true,
      filters: {
        ordering: ['-released'],
        parent_platforms: undefined,
      },
    };

    this.dates = getDatesWithNextYear();
  }

  componentDidUpdate(prevProps) {
    if (this.props.month !== prevProps.month || this.props.year !== prevProps.year) {
      this.reload();
    }
  }

  handlePopularOnlyClick = () => {
    this.setState(
      evolve({
        popularOnly: not,
      }),
      this.reload,
    );
  };

  onChangeFilters = (filters) => {
    this.setState({ filters }, this.reload);
  };

  reload = () => this.load(true);

  load = async (firstPage = false) => {
    const { popularOnly, filters } = this.state;
    const { month, year, dispatch, calendar, location } = this.props;
    const { next } = calendar;

    await dispatch(
      loadCalendar({
        page: firstPage ? 1 : next,
        onlyNext: firstPage ? false : !!next,
        popular: popularOnly,
        ordering: head(get(filters, 'ordering')),
        platforms: head(get(filters, 'parent_platforms')),
        month,
        year,
      }),
    );

    if (!firstPage) {
      pageView(getUrlWidthQuery(location, { page: next }));
    }
  };

  isMonthsEmpty() {
    const { months } = this.props.calendar;

    return !months || months.length === 0;
  }

  renderMonthsSelector() {
    const { month, year } = this.props;

    return (
      <CalendarMonths dates={this.dates} activeMonth={month} activeYear={year} urlBase={paths.releaseDates} showLinks />
    );
  }

  renderEmpty() {
    const { platforms } = this.props.calendar;
    const { filters } = this.state;
    const { month, year } = this.props;
    const platform = head(get(filters, 'parent_platforms'));

    if (this.isMonthsEmpty()) {
      return null;
    }

    const platformValue = platform ? platforms.find(propEq('id', platform)).name : null;
    const monthValue = <FormattedDate value={new Date(year, month - 1, 1)} month="long" />;

    const message = (
      <FormattedMessage
        id={platform ? 'calendar.empty_platform' : 'calendar.empty'}
        values={{
          platform: platformValue,
          month: monthValue,
          year,
        }}
      />
    );

    return <EmptyList message={message} />;
  }

  renderFilterCheckoxes = () => (
    <ToggleButton
      enabled={this.state.popularOnly}
      onChange={this.handlePopularOnlyClick}
      text={<SimpleIntlMessage id="calendar.popular" />}
    />
  );

  renderGames = () => {
    const { items, calendar } = this.props;
    const { count, next, loading, loaded, platforms } = calendar;

    return (
      <DiscoverGamesList
        load={this.load}
        section={section}
        showSeoPagination={false}
        headRight={this.renderFilterCheckoxes()}
        withFilter
        emptyMessage={this.renderEmpty()}
        filterProperties={{
          urlBase: paths.releaseDates,
          linkable: false,
          enableDatesFilter: false,
          onChange: this.onChangeFilters,
          filters: this.state.filters,
          platforms,
          section,
        }}
        games={{
          items,
          count,
          next,
          loading,
          loaded,
        }}
        gameCardProperties={{
          showReleaseDate: true,
        }}
      />
    );
  };

  render() {
    return (
      <div className="calendar">
        {this.renderMonthsSelector()}
        <div className="calendar__games">{this.renderGames()}</div>
      </div>
    );
  }
}
