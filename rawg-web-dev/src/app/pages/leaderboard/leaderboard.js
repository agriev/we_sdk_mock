/* eslint-disable camelcase */

import React, { useCallback, useState } from 'react';
// import PropTypes from 'prop-types';
import { useIntl, FormattedMessage } from 'react-intl';
import { compose } from 'recompose';
import { useSelector, useDispatch } from 'react-redux';
import { hot } from 'react-hot-loader/root';

import isNumber from 'lodash/isNumber';

import prepare from 'tools/hocs/prepare';
import checkLocale from 'tools/hocs/check-locale';

import Page from 'app/ui/page';
import Content from 'app/ui/content';
import Heading from 'app/ui/heading';
import Arrow from 'app/ui/arrow';
import Loading from 'app/ui/loading-2';
import Button from 'app/ui/button';

import appHelper from 'app/pages/app/app.helper';

import './leaderboard.styl';

import CalendarMonths from 'app/ui/calendar-months';

import { loadLeaderboard } from 'app/pages/leaderboard/leaderboard.actions';

import getCurrentYear from 'tools/dates/current-year';
import getCurrentMonth from 'tools/dates/current-month';
import { getDatesWithPreviousYear } from 'tools/dates/get-dates';

import LeaderboardPosition from './components/position';

const loadNextLogic = false;

const inDataRange = (earliestMonth, earliestYear) => ({ month, year }) => {
  const date = new Date(year, month - 1, 1);
  const earliestDate = new Date(earliestYear, earliestMonth - 1, 1);

  return date >= earliestDate;
};

const hoc = compose(
  hot,
  prepare(async ({ store }) => {
    await store.dispatch(loadLeaderboard({ page: 1 }));
  }),
  checkLocale('en'),
);

const LeaderboardPage = () => {
  const intl = useIntl();
  const dispatch = useDispatch();

  const users = useSelector((state) => state.leaderboard.users.items);
  const usersLoading = useSelector((state) => state.leaderboard.users.loading);
  const usersCount = useSelector((state) => state.leaderboard.users.count);
  // const usersLoaded = useSelector((state) => state.leaderboard.users.loaded);
  const usersNextPage = useSelector((state) => state.leaderboard.users.next);
  const earliestMonth = useSelector((state) => state.leaderboard.meta.earliest_month);
  const earliestYear = useSelector((state) => state.leaderboard.meta.earliest_year);
  const appSize = useSelector((state) => state.app.size);
  const currentUser = useSelector((state) => state.currentUser);

  const dates = getDatesWithPreviousYear().filter(inDataRange(earliestMonth, earliestYear));
  const [activeDate, setActiveDate] = useState({ month: getCurrentMonth(), year: getCurrentYear() });

  const loadNextPage = useCallback(
    async (pageArg, monthArg, yearArg) => {
      const page = isNumber(pageArg) ? pageArg : undefined;
      const month = monthArg || activeDate.month;
      const year = yearArg || activeDate.year;

      await dispatch(
        loadLeaderboard({
          page: page || usersNextPage,
          data: { month, year },
        }),
      );
    },
    [usersNextPage, activeDate.month, activeDate.year],
  );

  const handleMonthClick = useCallback(
    ({ month, year }) => {
      setActiveDate({ month, year });
      loadNextPage(1, month, year);
    },
    [activeDate.month, activeDate.year],
  );

  const renderLoadMore = () => {
    if (appHelper.isDesktopSize(appSize)) {
      return (
        <>
          {loadNextLogic && usersNextPage && usersCount > 0 && !usersLoading && (
            <div key="load-btn" className="leaderboard__more-games">
              <div className="leaderboard__more-games-line" />
              <div className="leaderboard__more-games-button" onClick={loadNextPage} role="button" tabIndex={0}>
                <FormattedMessage id="shared.view_more" />
                <Arrow className="leaderboard__more-games-button-icon" size="small" direction="bottom" />
              </div>
              <div className="leaderboard__more-games-line" />
            </div>
          )}
          {usersLoading && <Loading key="loading-icon" className="leaderboard__loading" size="large" />}
        </>
      );
    }

    if (loadNextLogic && usersNextPage && usersCount > 0) {
      return (
        <Button
          key="load-btn"
          className="leaderboard__more-games-phone-button"
          kind="fill"
          size="medium"
          disabled={usersLoading}
          loading={usersLoading}
          onClick={loadNextPage}
        >
          <FormattedMessage id="shared.view_more" />
        </Button>
      );
    }

    if (usersLoading) {
      return <Loading key="loading-icon" className="leaderboard__loading" size="large" />;
    }

    return null;
  };

  return (
    <Page
      helmet={{
        title: intl.formatMessage({ id: 'leaderboard.seo_title' }),
        // description: intl.formatMessage({ id: 'leaderboard.seo_description' }),
      }}
      sidebarProperties={{
        onlyOnPhone: false,
      }}
      className="leaderboard-page"
    >
      <Content className="leaderboard-content" columns="1">
        <div key="content" className="leaderboard-container">
          <Heading className="leaderboard-title" rank={1}>
            <FormattedMessage id="leaderboard.heading" />
          </Heading>
          <CalendarMonths
            dates={dates}
            activeMonth={activeDate.month}
            activeYear={activeDate.year}
            onClick={handleMonthClick}
          />
          <div className="leaderboard">
            <div className="leaderboard-wrap">
              <div className="leaderboard__headings">
                <div className="leaderboard__heading">
                  <FormattedMessage id="leaderboard.name" />
                </div>
                {appHelper.isDesktopSize(appSize) && (
                  <div className="leaderboard__heading">
                    <FormattedMessage id="leaderboard.per-day" />
                  </div>
                )}
                {appHelper.isPhoneSize(appSize) && (
                  <div className="leaderboard__heading">
                    <FormattedMessage id="leaderboard.per-day-and-month" />
                  </div>
                )}
                {appHelper.isDesktopSize(appSize) && (
                  <div className="leaderboard__heading">
                    <FormattedMessage id="leaderboard.per-month" />
                  </div>
                )}
              </div>
              <div className="leaderboard__items">
                {users.map((item, index) => (
                  <LeaderboardPosition
                    key={item.user.id}
                    index={index}
                    position={item}
                    currentUser={currentUser}
                    size={appSize}
                  />
                ))}
              </div>
              {renderLoadMore()}
            </div>
          </div>
        </div>
      </Content>
    </Page>
  );
};

const Leaderboard = hoc(LeaderboardPage);

export default Leaderboard;
