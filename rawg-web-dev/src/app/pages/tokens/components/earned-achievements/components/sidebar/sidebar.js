import React from 'react';
import { FormattedMessage } from 'react-intl';

import './sidebar.styl';

import appHelper from 'app/pages/app/app.helper';
import { discordUrl } from 'app/pages/app/app.consts';

const Sidebar = ({ size }) => [
  <div key="help1" className="tokens__earned-achievements-help-block">
    <h2>
      <FormattedMessage id="tokens.earned_achievements_help_title1" />
    </h2>
    <p>
      <FormattedMessage id="tokens.earned_achievements_help_text1" />
    </p>
  </div>,
  <div key="help2" className="tokens__earned-achievements-help-block">
    <h3>
      <FormattedMessage id="tokens.earned_achievements_help_title2" />
    </h3>
    <div className="tokens__earned-achievements-help__achievements">
      <div className="tokens__earned-achievements-help__achievement">
        <div data-type="gold" className="tokens__earned-achievements-help__achievement-value">
          50
        </div>
        <div className="tokens__earned-achievements-help__achievement-title">
          <FormattedMessage id="tokens.earned_achievements_gold" />
        </div>
      </div>
      <div className="tokens__earned-achievements-help__achievement">
        <div data-type="silver" className="tokens__earned-achievements-help__achievement-value">
          30
        </div>
        <div className="tokens__earned-achievements-help__achievement-title">
          <FormattedMessage id="tokens.earned_achievements_silver" />
        </div>
      </div>
      <div className="tokens__earned-achievements-help__achievement">
        <div data-type="bronze" className="tokens__earned-achievements-help__achievement-value">
          10
        </div>
        <div className="tokens__earned-achievements-help__achievement-title">
          <FormattedMessage id="tokens.earned_achievements_bronze" />
        </div>
      </div>
    </div>
  </div>,
  <div key="help3" className="tokens__earned-achievements-help-block">
    <h3>
      <FormattedMessage id="tokens.earned_achievements_help_title3" />
    </h3>
    <p>
      <FormattedMessage id="tokens.earned_achievements_help_text3" />
    </p>
  </div>,
  appHelper.isDesktopSize({ size }) && (
    <a
      key="discord"
      href={discordUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="tokens__earned-achievements-discord"
    >
      <FormattedMessage id="tokens.earned_achievements_discord" />
    </a>
  ),
];

export default Sidebar;
