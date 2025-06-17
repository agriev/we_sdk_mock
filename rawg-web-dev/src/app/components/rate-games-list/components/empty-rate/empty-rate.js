import React, { Component } from 'react';
import { hot } from 'react-hot-loader';
import { Link } from 'app/components/link';
import { FormattedMessage } from 'react-intl';

import paths from 'config/paths';
import Heading from 'app/ui/heading/heading';
import SimpleIntlMessage from 'app/components/simple-intl-message';

import EmptyList from 'app/ui/empty-list';

import './empty-rate.styl';

@hot(module)
class EmptyRate extends Component {
  getLink(path, message) {
    return (
      <Link className="empty-rate__link" to={path} href={path}>
        {message}
      </Link>
    );
  }

  getLinks() {
    return {
      settings_link: this.getLink(paths.settingsGameAccounts, <SimpleIntlMessage id="profile.import_games" />),
      games_link: this.getLink(paths.games, <SimpleIntlMessage id="profile.add_games_lowercase" />),
    };
  }

  render() {
    const message = <FormattedMessage id="profile.no_games_to_rate_text" values={this.getLinks()} />;

    return (
      <div className="empty-rate">
        <Heading rank={3} centred withMobileOffset>
          <SimpleIntlMessage id="profile.no_games_to_rate" />
        </Heading>
        <EmptyList message={message} />
      </div>
    );
  }
}

export default EmptyRate;
