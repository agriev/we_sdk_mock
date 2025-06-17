import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { injectIntl } from 'react-intl';
import { connect } from 'react-redux';
import { hot } from 'react-hot-loader/root';

import upperFirst from 'lodash/upperFirst';

import prepare from 'tools/hocs/prepare';
import SimpleIntlMessage from 'app/components/simple-intl-message';

import getCurrentYear from 'tools/dates/current-year';
import getCurrentMonth from 'tools/dates/current-month';

import Content from 'app/ui/content';
import Heading from 'app/ui/heading/heading';

import Calendar from 'app/components/calendar';

import { loadCalendar, loadCalendarPlatforms } from 'app/components/calendar/calendar.actions';

import 'app/pages/showcase/showcase.styl';
import './release-dates.styl';
import DiscoverPage from 'app/ui/discover-page/discover-page';

import { appSizeType } from 'app/pages/app/app.types';
import locationShape from 'tools/prop-types/location-shape';
import intlShape from 'tools/prop-types/intl-shape';

import appHelper from 'app/pages/app/app.helper';

@hot
@prepare(async ({ store, params }) => {
  const { year = getCurrentYear(), month = getCurrentMonth() } = params;

  await Promise.all([store.dispatch(loadCalendar({ year, month })), store.dispatch(loadCalendarPlatforms())]);
})
@injectIntl
@connect((state) => ({
  size: state.app.size,
}))
export default class ReleaseDates extends Component {
  static propTypes = {
    intl: intlShape.isRequired,
    size: appSizeType.isRequired,
    location: locationShape.isRequired,
    params: PropTypes.shape({
      year: PropTypes.string,
      month: PropTypes.string,
    }),
  };

  render() {
    const { location, intl, size, params } = this.props;
    const { pathname } = location;
    const isPhone = appHelper.isPhoneSize(size);

    const { year = getCurrentYear(), month = getCurrentMonth() } = params;
    const selectedDate = new Date(year, month - 1, 1);
    const monthStr = upperFirst(intl.formatDate(selectedDate, { month: 'long' }));

    const titleId = { id: 'calendar.title' };
    const titleValues = { year: getCurrentYear(), month: monthStr };

    return (
      <DiscoverPage
        pageProperties={{
          helmet: {
            title: intl.formatMessage(titleId, titleValues),
          },
          sidebarProperties: {
            hideHeading: true,
            // needControls: true,
          },
        }}
        className="release-dates"
        pathname={pathname}
        isPhoneSize={isPhone}
      >
        <Content className="release-dates__content" columns="1">
          <Heading rank={1} withMobileOffset>
            <SimpleIntlMessage id="calendar.heading" values={{ month: monthStr, year }} />
          </Heading>
          <div className="release-dates__columns">
            <Calendar month={parseInt(month, 10)} year={parseInt(year, 10)} />
          </div>
        </Content>
      </DiscoverPage>
    );
  }
}
