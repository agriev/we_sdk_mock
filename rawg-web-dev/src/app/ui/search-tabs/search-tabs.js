import React from 'react';
import PropTypes from 'prop-types';
import cn from 'classnames';
import SimpleIntlMessage from 'app/components/simple-intl-message/simple-intl-message';

import onlyUpdateForKeysDeep from 'tools/only-update-for-keys-deep';
import { changeTab } from 'app/pages/search/search.actions';

import Tabs from 'app/ui/tabs';
import Tab from 'app/ui/tabs/tab';

import './search-tabs.styl';

const updater = onlyUpdateForKeysDeep([
  'search.allGames.results',
  'search.personalGames.results',
  'search.allCollections.results',
  'search.allPersons.results',
  'search.allUsers.results',
  'search.tab',
]);

const componentPropertyTypes = {
  className: PropTypes.string,
  search: PropTypes.shape({
    allGames: PropTypes.array,
    personalGames: PropTypes.array,
    allCollections: PropTypes.array,
    allPersons: PropTypes.array,
    allUsers: PropTypes.array,
    tab: PropTypes.string,
  }).isRequired,
  dispatch: PropTypes.func.isRequired,
};

const defaultProps = {
  className: '',
};

const SearchTabs = ({ className, search, dispatch }) => {
  const { allGames, personalGames, allCollections, allPersons, allUsers, tab } = search;

  const { count: gamesCount, results: games = [] } = allGames;
  const { count: collectionsCount, results: collections = [] } = allCollections;
  const { count: personsCount, results: persons = [] } = allPersons;
  const { count: usersCount, results: users = [] } = allUsers;
  const { count: personalCount, results: personalGamesList = [] } = personalGames;

  const handleTabClick = (currentTab) => {
    dispatch(changeTab(currentTab));
  };

  return (
    <Tabs className={cn('search-tabs', className)} centred={false} onlyMobileCentred>
      <Tab
        onClick={() => handleTabClick('games')}
        active={tab === 'games'}
        disabled={games.length === 0}
        className="search-tabs__tab"
        counter={gamesCount}
      >
        <SimpleIntlMessage id="search.tab_games" />
      </Tab>
      <Tab
        onClick={() => handleTabClick('library')}
        active={tab === 'library'}
        disabled={personalGamesList.length === 0}
        counter={personalCount}
        className="search-tabs__tab"
      >
        <SimpleIntlMessage id="search.tab_library" />
      </Tab>
      <Tab
        onClick={() => handleTabClick('collections')}
        active={tab === 'collections'}
        disabled={collections.length === 0}
        counter={collectionsCount}
        className="search-tabs__tab"
      >
        <SimpleIntlMessage id="search.tab_collections" />
      </Tab>
      <Tab
        onClick={() => handleTabClick('persons')}
        active={tab === 'persons'}
        disabled={!persons || persons.length === 0}
        counter={personsCount}
        className="search-tabs__tab"
      >
        <SimpleIntlMessage id="search.tab_developers" />
      </Tab>
      <Tab
        onClick={() => handleTabClick('users')}
        active={tab === 'users'}
        disabled={!users || users.length === 0}
        counter={usersCount}
        className="search-tabs__tab"
      >
        <SimpleIntlMessage id="search.tab_users" />
      </Tab>
    </Tabs>
  );
};

SearchTabs.propTypes = componentPropertyTypes;
SearchTabs.defaultProps = defaultProps;

export default updater(SearchTabs);
