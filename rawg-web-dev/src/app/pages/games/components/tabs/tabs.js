import React from 'react';

import SimpleIntlMessage from 'app/components/simple-intl-message/simple-intl-message';

import Tabs from 'app/ui/tabs/tabs';
import Tab from 'app/ui/tabs/tab/tab';
import paths from 'config/paths';

import './tabs.styl';

const GamesTabs = () => (
  <div className="games__tabs-wrap">
    <Tabs className="games__tabs" centred={false}>
      <Tab to={paths.games}>
        <SimpleIntlMessage id="games.tab_games" />
      </Tab>
      <Tab to={paths.releaseDates}>
        <SimpleIntlMessage id="games.tab_calendar" />
      </Tab>
    </Tabs>
  </div>
);

export default GamesTabs;
