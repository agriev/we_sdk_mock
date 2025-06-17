import React from 'react';
import PropTypes from 'prop-types';
import { injectIntl } from 'react-intl';
import { hot } from 'react-hot-loader';
import { compose, withState } from 'recompose';

import locationShape from 'tools/prop-types/location-shape';
import intlShape from 'tools/prop-types/intl-shape';

import prepare from 'tools/hocs/prepare';
import checkFeature from 'tools/hocs/check-feature';

import Page from 'app/ui/page';
import Content from 'app/ui/content';
// import Footer from 'app/ui/footer';
import TokensStatusChanger from './components/dev--status-changer';
import TokensHead from './components/head';
import TokensJoin from './components/join';
import TokensStats from './components/stats';
import TokensShare from './components/share';
import TokenProgramNotifications from './components/notifications';
import TokensNextCycle from './components/next';
import TokensOffers from './components/offers';
import TokensEarnedAchievements from './components/earned-achievements';
import TokensRecommendedGames from './components/recommended-games';
import TokensLeaderboard from './components/leaderboard';
import TokensReward from './components/reward';

import './tokens.styl';
import { loadCurrentCycle } from './tokens.actions';
import { loadLeaderboardFirst, loadOffers, loadLastAchievement, loadReward } from './tokens.data.actions';

const hoc = compose(
  hot(module),
  checkFeature('tokens'),
  prepare(async ({ store }) => {
    await Promise.all([
      store.dispatch(loadCurrentCycle()),
      store.dispatch(loadLeaderboardFirst()),
      store.dispatch(loadReward()),
      store.dispatch(loadOffers()),
      store.dispatch(loadLastAchievement()),
    ]);
  }),
  injectIntl,
  withState('activeSection', 'setActiveSection', 'achievements'),
);

const componentPropertyTypes = {
  intl: intlShape.isRequired,
  location: locationShape.isRequired,
  activeSection: PropTypes.string.isRequired,
  setActiveSection: PropTypes.func.isRequired,
};

const Tokens = ({ intl, location, activeSection, setActiveSection }) => (
  <Page
    className="tokens"
    helmet={{ title: intl.formatMessage({ id: 'tokens.head_title' }) }}
    aboveHeader={<TokenProgramNotifications />}
  >
    <Content columns="1">
      <div className="tokens__content">
        <TokensStatusChanger />
        <TokensHead />
        <TokensJoin />
        <TokensStats activeSection={activeSection} />
        <TokensShare location={location} />
        <TokensNextCycle />
        <TokensEarnedAchievements setActiveSection={setActiveSection} />
        <TokensRecommendedGames setActiveSection={setActiveSection} />
        <TokensLeaderboard setActiveSection={setActiveSection} />
        <TokensReward setActiveSection={setActiveSection} />
        <TokensOffers setActiveSection={setActiveSection} />
      </div>
      {/* <Footer className="tokens__footer" /> */}
    </Content>
  </Page>
);

Tokens.propTypes = componentPropertyTypes;

export default hoc(Tokens);
