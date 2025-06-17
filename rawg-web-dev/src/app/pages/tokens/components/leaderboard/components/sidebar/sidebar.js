import React from 'react';
import { FormattedMessage } from 'react-intl';
import SVGInline from 'react-svg-inline';

import statsUpIcon from 'app/pages/tokens/assets/stats-up.svg';

import './sidebar.styl';
import appHelper from 'app/pages/app/app.helper';

const data = [
  {
    positionsUp: 100,
    karma: 560,
    achievements_gold: 10,
    achievements_silver: 24,
    achievements_bronze: 48,
  },
  {
    positionsUp: 50,
    karma: 360,
    achievements_gold: 6,
    achievements_silver: 18,
    achievements_bronze: 32,
  },
  {
    positionsUp: 30,
    karma: 220,
    achievements_gold: 1,
    achievements_silver: 2,
    achievements_bronze: 3,
  },
];

const Sidebar = ({ size }) => {
  const block1 = (
    <div key="help1" className="tokens__leaderboard-help-block">
      <h2>
        <FormattedMessage id="tokens.leaderboard_help_title1" />
      </h2>
      <p>
        <FormattedMessage id="tokens.leaderboard_help_text1" />
      </p>
    </div>
  );

  const block2 = (
    <div key="help2" className="tokens__leaderboard-help-block">
      <h3>
        <FormattedMessage id="tokens.leaderboard_help_title2" />
      </h3>
      <div className="tokens__leaderboard-help__karma-table">
        {data.map((item) => (
          <div key={item.positionsUp} className="tokens__leaderboard-help__karma-table-item">
            <div className="tokens__leaderboard-help__karma-table__positions">
              <div className="tokens__leaderboard-help__karma-table__positions-value">
                {item.positionsUp}
                <SVGInline
                  width={`${appHelper.isDesktopSize({ size }) ? 19 : 13}px`}
                  height={`${appHelper.isDesktopSize({ size }) ? 12 : 8}px`}
                  svg={statsUpIcon}
                />
              </div>
              <div className="tokens__leaderboard-help__karma-table__positions-desc">positions up</div>
            </div>
            <div className="tokens__leaderboard-help__karma-table__reward">
              <div className="tokens__leaderboard-help__karma-table__reward-value">+{item.karma}</div>
              <div className="tokens__leaderboard-help__karma-table__reward-desc">karma points</div>
            </div>
            <div className="tokens__leaderboard-help__karma-table__achievements">
              <div className="tokens__leaderboard-help__karma-table__achievements-data-gold">
                {item.achievements_gold}
              </div>
              <div className="tokens__leaderboard-help__karma-table__achievements-data-silver">
                {item.achievements_silver}
              </div>
              <div className="tokens__leaderboard-help__karma-table__achievements-data-bronze">
                {item.achievements_bronze}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (appHelper.isDesktopSize({ size })) {
    return [block1, block2];
  }

  return [block2, block1];
};

export default Sidebar;
