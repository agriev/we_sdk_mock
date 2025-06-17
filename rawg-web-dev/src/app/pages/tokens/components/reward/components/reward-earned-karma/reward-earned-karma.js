import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import cn from 'classnames';

import Button from 'app/ui/button';
import { convertingKarma } from 'app/pages/tokens/tokens.actions';
import { rewardType } from 'app/pages/tokens/tokens.data.types';

import './reward-earned-karma.styl';
import SimpleIntlMessage from 'app/components/simple-intl-message/simple-intl-message';
import { calcTimeLeft } from 'app/pages/tokens/tokens.funcs';

import TokensRewardTopline from '../reward-topline';

const componentPropertyTypes = {
  className: PropTypes.string,
  reward: rewardType.isRequired,
  dispatch: PropTypes.func.isRequired,
  tokensTotal: PropTypes.number.isRequired,
};

const defaultProps = {
  className: '',
};

const convertKarma = (yourTokens, yourKarma) => (
  <div className="tokens__reward-earned-karma">
    <div className="tokens__reward-earned-karma__karma-wrap">
      <span className="tokens__reward-earned-karma__count">{yourKarma}</span>
      <div className="tokens__reward-earned-karma__subtitle">
        <SimpleIntlMessage id="tokens.reward_earned_karma" />
      </div>
    </div>
    <div className="tokens__reward-earned-karma__exchange-icon" />
    <div className="tokens__reward-earned-karma__coins">{yourTokens}</div>
  </div>
);

const convertKarmaSuccess = (yourTokens, tokensTotal) => (
  <div className="tokens__reward-earned-karma">
    <div className="tokens__reward-earned-karma__coins tokens__reward-earned-karma__coins_light">+{yourTokens}</div>
    <div className="tokens__reward-earned-karma__balance">
      <FormattedMessage
        id="tokens.exchange_balance"
        values={{
          tokens: <span className="tokens__reward-earned-karma__tokens-counter">{yourTokens + tokensTotal}</span>,
        }}
      />
    </div>
  </div>
);

class RewardEarnedKarma extends Component {
  static propTypes = componentPropertyTypes;

  constructor(props) {
    super(props);

    this.state = {
      isConverted: false,
    };
  }

  exchangeUntilFormatted = (exchangeUntil) => {
    const [days, hours, mins] = calcTimeLeft(exchangeUntil);

    return (
      <span>
        {days > 0 && <FormattedMessage id="tokens.notifications_next_time_days" values={{ days }} />}
        {hours > 0 && ' '}
        {hours > 0 && <FormattedMessage id="tokens.notifications_next_time_hours" values={{ hours }} />}
        {mins > 0 && ' '}
        {mins > 0 && <FormattedMessage id="tokens.notifications_next_time_mins" values={{ mins }} />}
      </span>
    );
  };

  handleConvertKarma = () => {
    const { dispatch } = this.props;
    dispatch(convertingKarma());
    this.setState({ isConverted: true });
  };

  render() {
    const { className, reward, tokensTotal } = this.props;
    const { isConverted } = this.state;
    const { your_top: yourTop, exchange_until: exchangeUntil, your_karma: yourKarma, your_tokens: yourTokens } = reward;

    const firstMessage = (
      <FormattedMessage
        id="tokens.reward_top_position"
        values={{
          message: (
            <b>
              <SimpleIntlMessage id="tokens.reward_top_percent" values={{ percent: yourTop }} />
            </b>
          ),
        }}
      />
    );

    const secondMessage = (
      <FormattedMessage
        id="tokens.reward_exchange_time"
        values={{ time: this.exchangeUntilFormatted(exchangeUntil) }}
      />
    );

    return (
      <div className={cn('tokens__reward-earned-karma_container', className)}>
        {isConverted ? (
          <TokensRewardTopline firstMessage={<SimpleIntlMessage id="tokens.reward_done" />} />
        ) : (
          <TokensRewardTopline firstMessage={firstMessage} secondMessage={secondMessage} />
        )}
        {isConverted ? convertKarmaSuccess(yourTokens, tokensTotal) : convertKarma(yourTokens, yourKarma)}
        {!isConverted && (
          <Button
            className="tokens__reward-earned-karma__button"
            kind="fill"
            size="small"
            onClick={this.handleConvertKarma}
          >
            <FormattedMessage
              id="tokens.exchange_tokens"
              values={{
                tokens: <span className="tokens__reward-earned-karma__tokens-counter">{yourTokens}</span>,
              }}
            />
          </Button>
        )}
      </div>
    );
  }
}

RewardEarnedKarma.propTypes = componentPropertyTypes;

RewardEarnedKarma.defaultProps = defaultProps;

export default RewardEarnedKarma;
