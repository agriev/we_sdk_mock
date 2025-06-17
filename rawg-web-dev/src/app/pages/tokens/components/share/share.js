import React from 'react';
import { FormattedMessage } from 'react-intl';
import { hot } from 'react-hot-loader';
import cn from 'classnames';
import { connect } from 'react-redux';
import cookies from 'browser-cookies';
import get from 'lodash/get';

import {
  FacebookShareButton,
  TwitterShareButton,
  VKShareButton,
  WhatsappShareButton,
  TelegramShareButton,
  RedditShareButton,
} from 'react-share';

import copyTextToClipboard from 'tools/copy-to-clipboard';
import currentUserType from 'app/components/current-user/current-user.types';
import locationShape from 'tools/prop-types/location-shape';

import { status as statusType, STATUS_ACTIVE } from 'app/pages/tokens/tokens.types';

import './share.styl';

@hot(module)
@connect((state) => ({
  currentUser: state.currentUser,
  status: state.tokensDashboard.status,
}))
class TokensShare extends React.Component {
  static propTypes = {
    currentUser: currentUserType.isRequired,
    location: locationShape.isRequired,
    status: statusType.isRequired,
  };

  constructor(props) {
    super(props);

    this.state = {
      copied: false,
    };
  }

  componentDidMount() {
    const { location } = this.props;
    const trp = get(location, 'query.trp');
    if (trp) {
      cookies.set('referer-trp', trp, { expires: 30 });
    }
  }

  getUrl = () => {
    const { currentUser } = this.props;
    if (typeof window !== 'undefined') {
      return `${window.location.href}?trp=${currentUser.id}`;
    }
    return '';
  };

  copyLink = () => {
    copyTextToClipboard(this.getUrl());
    this.setState({ copied: true });
    setTimeout(() => this.setState({ copied: false }), 2000);
  };

  render() {
    const { copied } = this.state;
    const { status, currentUser } = this.props;
    const url = this.getUrl();

    return (
      <div
        className={cn('tokens__share-container', `tokens__share-container_${status}`, {
          'tokens__share-container_joined': currentUser.token_program,
        })}
      >
        <div className="tokens__share">
          <div className="tokens__share__title">
            <FormattedMessage id={status === STATUS_ACTIVE ? 'tokens.share_title' : 'tokens.share_title_completed'} />
          </div>
          <div className="tokens__share__btns">
            <FacebookShareButton className="tokens__share__btn" url={url}>
              <FormattedMessage id="socials.facebook" />
            </FacebookShareButton>
            <TwitterShareButton className="tokens__share__btn" url={url}>
              <FormattedMessage id="socials.twitter" />
            </TwitterShareButton>
            <VKShareButton className="tokens__share__btn" url={url}>
              <FormattedMessage id="socials.vk" />
            </VKShareButton>
            <WhatsappShareButton className="tokens__share__btn" url={url}>
              <FormattedMessage id="socials.whatsapp" />
            </WhatsappShareButton>
            <TelegramShareButton className="tokens__share__btn" url={url}>
              <FormattedMessage id="socials.telegram" />
            </TelegramShareButton>
            <RedditShareButton className="tokens__share__btn" url={url}>
              <FormattedMessage id="socials.reddit" />
            </RedditShareButton>
            <div
              className={cn('tokens__share__btn', { tokens__share__btn_copied: copied })}
              role="button"
              tabIndex={0}
              onClick={this.copyLink}
            >
              {!copied && <FormattedMessage id="socials.copy" />}
              {copied && <FormattedMessage id="socials.copied" />}
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default TokensShare;
