import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import cn from 'classnames';

import RoundProgressbar from 'app/ui/round-progressbar';
import Button from 'app/ui/button';
import SimpleIntlMessage from 'app/components/simple-intl-message';
import { rewardType } from 'app/pages/tokens/tokens.data.types';

import TokensRewardTopline from '../reward-topline';

import './reward-not-reached.styl';

const componentPropertyTypes = {
  className: PropTypes.string,
  reward: rewardType.isRequired,
};

const defaultProps = {
  className: '',
};

const RewardNotReached = ({ className, reward }) => {
  const { your_top: yourTop, tokens, users } = reward;

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
    <SimpleIntlMessage id="tokens.reward_top_stats" values={{ tokensCount: tokens, usersCount: users }} />
  );

  return (
    <div className={cn('tokens__reward-not-reached', className)}>
      <TokensRewardTopline firstMessage={firstMessage} secondMessage={secondMessage} />
      <RoundProgressbar className="tokens__reward-not-reached__progressbar" percent={75} />
      <div className="tokens__reward-not-reached__title">
        <SimpleIntlMessage id="tokens.reward_goals_title" />
      </div>
      <div className="tokens__reward-not-reached__text">
        <SimpleIntlMessage id="tokens.reward_goals_text" values={{ count: tokens }} />
      </div>
      <div className="tokens__reward-not-reached__divider" />
      <Button className="tokens__reward-not-reached__button" kind="fill" size="small" disabled>
        <SimpleIntlMessage id="tokens.get_tokens" />
      </Button>
    </div>
  );
};

RewardNotReached.propTypes = componentPropertyTypes;

RewardNotReached.defaultProps = defaultProps;

export default RewardNotReached;
