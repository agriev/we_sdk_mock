import React from 'react';
import PropTypes from 'prop-types';
import { injectIntl, FormattedMessage } from 'react-intl';
import SVGInline from 'react-svg-inline';
import cn from 'classnames';
import upperFirst from 'lodash/upperFirst';

import paths from 'config/paths';
import trans from 'tools/trans';

import Sharing from 'app/components/sharing';
import shareIcon from 'assets/icons/share.svg';

import intlShape from 'tools/prop-types/intl-shape';

import './rate-landing-share.styl';

const propTypes = {
  type: PropTypes.oneOf(['button', 'default']),
  className: PropTypes.string,
  intl: intlShape.isRequired,
};

const defaultProps = {
  type: 'default',
  className: undefined,
};

const socialButtonPropertyTypes = {
  type: PropTypes.oneOf(['button', 'default']).isRequired,
  provider: PropTypes.oneOf(['facebook', 'twitter']).isRequired,
  intl: intlShape.isRequired,
};

const SocialButton = ({ type, provider, intl }) => {
  const className = cn('rate-landing-share__button', `rate-landing-share__button_${provider}`);

  let buttonText = intl.formatMessage({ id: `shared.social_${provider}` });
  if (type === 'button') {
    buttonText = upperFirst(buttonText);
  }

  return (
    <Sharing className={className} url={paths.rateTopGames} provider={provider}>
      {buttonText}
    </Sharing>
  );
};

SocialButton.propTypes = socialButtonPropertyTypes;

const RateLandingShare = ({ type, className, intl }) => {
  const vkButton = <SocialButton type={type} provider="vk" intl={intl} />;
  const twButton = <SocialButton type={type} provider="twitter" intl={intl} />;

  if (type === 'button') {
    return (
      <div
        className={cn('rate-landing-share', `rate-landing-share_${type}`, {
          [className]: !!className,
        })}
      >
        <span className="rate-landing-share__text">{trans('rate_games.share')}</span>
        <span className="rate-landing-share__buttons-list">
          {vkButton}
          {twButton}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn('rate-landing-share', `rate-landing-share_${type}`, {
        [className]: !!className,
      })}
    >
      <SVGInline className="rate-landing-share__icon" svg={shareIcon} />
      <FormattedMessage id="rate_games.share_with_links" values={{ link_vk: vkButton, link_tw: twButton }} />
    </div>
  );
};

RateLandingShare.propTypes = propTypes;
RateLandingShare.defaultProps = defaultProps;

export default injectIntl(RateLandingShare);
