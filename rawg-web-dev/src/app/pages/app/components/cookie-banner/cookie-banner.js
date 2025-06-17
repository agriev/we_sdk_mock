import React from 'react';
import { FormattedMessage } from 'react-intl';
import { Link } from 'app/components/link';

import SimpleIntlMessage from 'app/components/simple-intl-message/simple-intl-message';
import CloseButton from 'app/ui/close-button';

import { appLocaleType } from 'app/pages/app/app.types';

import cookieStorage from './cookie-banner.storage';

import './cookie-banner.styl';

const cookiesPolicyPath = '/assets/cookies-policy.pdf';

class CookieBanner extends React.Component {
  static propTypes = {
    locale: appLocaleType.isRequired,
  };

  constructor(props) {
    super(props);

    this.state = {
      isHidden: true,
    };
  }

  componentDidMount() {
    const { locale } = this.props;

    this.setState({
      isHidden: cookieStorage.isHidden(locale),
    });
  }

  hideBanner = () => {
    this.setState({
      isHidden: true,
    });

    cookieStorage.hideBanner();
  };

  render() {
    if (this.state.isHidden) return null;

    const link = (
      <Link to={cookiesPolicyPath} href="cookiesPolicyPath" target="_blank" onClick={this.hideBanner}>
        <SimpleIntlMessage id="shared.cookie_link" />
      </Link>
    );

    return (
      <div className="cookie-banner">
        <div className="cookie-banner__wrapper">
          <span>
            <FormattedMessage id="shared.cookie_message" values={{ link }} />
          </span>
          <CloseButton onClick={this.hideBanner} />
        </div>
      </div>
    );
  }
}

export default CookieBanner;
