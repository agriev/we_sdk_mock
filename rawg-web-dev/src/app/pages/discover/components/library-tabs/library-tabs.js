import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { compose } from 'recompose';

import './library-tabs.styl';

import Tabs from 'app/ui/tabs';
import Tab from 'app/ui/tabs/tab';
import SimpleIntlMessage from 'app/components/simple-intl-message';
import paths from 'config/paths';
import {
  DISCOVER_SEC_LIBRARY,
  DISCOVER_SEC_LIBRARY_UNCATEGORIZED,
  DISCOVER_SEC_LIBRARY_PLAYING,
  DISCOVER_SEC_LIBRARY_COMPLETED,
  DISCOVER_SEC_LIBRARY_PLAYED,
  DISCOVER_SEC_LIBRARY_NOTPLAYED,
} from 'app/pages/discover/discover.sections';

export const LIBRARY_TAB_ALL = 'LIBRARY_TAB_ALL';
export const LIBRARY_TAB_UNCATEGORIZED = 'LIBRARY_TAB_UNCATEGORIZED';
export const LIBRARY_TAB_PLAYING = 'LIBRARY_TAB_PLAYING';
export const LIBRARY_TAB_COMPLETED = 'LIBRARY_TAB_COMPLETED';
export const LIBRARY_TAB_PLAYED = 'LIBRARY_TAB_PLAYED';
export const LIBRARY_TAB_NOTPLAYED = 'LIBRARY_TAB_NOTPLAYED';

const hoc = compose(
  connect((state) => ({
    counters: state.discover.libraryCounters,
  })),
);

const propTypes = {
  counters: PropTypes.shape().isRequired,
  section: PropTypes.string.isRequired,
};

const defaultProps = {};

const DiscoverMyLibraryTabsComponent = ({ counters, section }) => {
  const counterNone = useMemo(() => ({ counter: '' }), []);
  const allCount =
    (counters.uncategorized || 0) +
    (counters.playing || 0) +
    (counters.beaten || 0) +
    (counters.dropped || 0) +
    (counters.yet || 0);

  const tabProperties = (tabSection) => ({
    to: paths.discoverSection(tabSection),
    active: tabSection === section,
  });

  return (
    <Tabs className="discover__my-library-tabs" centred={false}>
      <Tab counter={allCount} {...tabProperties(DISCOVER_SEC_LIBRARY)}>
        <SimpleIntlMessage id="profile.category_owned_all_games" values={counterNone} />
      </Tab>
      <Tab counter={counters.uncategorized || 0} {...tabProperties(DISCOVER_SEC_LIBRARY_UNCATEGORIZED)}>
        <SimpleIntlMessage id="profile.category_owned" values={counterNone} />
      </Tab>
      <Tab counter={counters.playing || 0} {...tabProperties(DISCOVER_SEC_LIBRARY_PLAYING)}>
        <SimpleIntlMessage id="profile.category_playing" values={counterNone} />
      </Tab>
      <Tab counter={counters.beaten || 0} {...tabProperties(DISCOVER_SEC_LIBRARY_COMPLETED)}>
        <SimpleIntlMessage id="profile.category_beaten" values={counterNone} />
      </Tab>
      <Tab counter={counters.dropped || 0} {...tabProperties(DISCOVER_SEC_LIBRARY_PLAYED)}>
        <SimpleIntlMessage id="profile.category_dropped" values={counterNone} />
      </Tab>
      <Tab counter={counters.yet || 0} {...tabProperties(DISCOVER_SEC_LIBRARY_NOTPLAYED)}>
        <SimpleIntlMessage id="profile.category_yet" values={counterNone} />
      </Tab>
    </Tabs>
  );
};

DiscoverMyLibraryTabsComponent.propTypes = propTypes;
DiscoverMyLibraryTabsComponent.defaultProps = defaultProps;

const DiscoverMyLibraryTabs = hoc(DiscoverMyLibraryTabsComponent);

export default DiscoverMyLibraryTabs;
