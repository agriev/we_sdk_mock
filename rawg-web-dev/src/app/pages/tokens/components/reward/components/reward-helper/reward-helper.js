import React from 'react';
import PropTypes from 'prop-types';

import './reward-helper.styl';
import SimpleIntlMessage from 'app/components/simple-intl-message/simple-intl-message';

const componentPropertyTypes = {
  className: PropTypes.string,
  tokens: PropTypes.number.isRequired,
};

const defaultProps = {
  className: '',
};

const RewardHelper = ({ className, tokens }) => {
  return (
    <div className={['tokens__reward-helper', className].join(' ')}>
      <h4 className="tokens__reward-helper-title">
        <SimpleIntlMessage id="tokens.reward_helper_title" />
      </h4>
      <p className="tokens__reward-helper-text">
        <SimpleIntlMessage id="tokens.reward_helper_text" values={{ count: tokens }} />
      </p>
    </div>
  );
};

RewardHelper.propTypes = componentPropertyTypes;

RewardHelper.defaultProps = defaultProps;

export default RewardHelper;
