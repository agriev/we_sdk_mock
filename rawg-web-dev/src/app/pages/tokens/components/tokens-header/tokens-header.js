import React from 'react';
import PropTypes from 'prop-types';
import cn from 'classnames';

import SimpleIntlMessage from 'app/components/simple-intl-message';

import './tokens-header.styl';

const componentPropertyTypes = {
  className: PropTypes.string,
  position: PropTypes.node,
  title: PropTypes.oneOfType([PropTypes.func, PropTypes.node]).isRequired,
  subtitle: PropTypes.oneOfType([PropTypes.func, PropTypes.node]),
};

const defaultProps = {
  className: '',
  position: undefined,
  subtitle: undefined,
};

const TokensHeader = ({ className, position, title, subtitle }) => {
  return (
    <div className={cn('tokens-header', className)}>
      <div
        className={cn('tokens-header__position', {
          'tokens-header__position_icon': typeof position === 'string',
        })}
      >
        {position}
      </div>
      <div className="tokens-header__texts">
        <div className="tokens-header__title">
          {typeof title === 'string' && <SimpleIntlMessage id={title} />}
          {typeof title === 'function' && title()}
          {typeof title === 'object' && title}
        </div>
        <div className="tokens-header__subtitle">
          {typeof subtitle === 'string' && <SimpleIntlMessage id={subtitle} />}
          {typeof subtitle === 'function' && subtitle()}
          {typeof subtitle === 'object' && subtitle}
        </div>
      </div>
    </div>
  );
};

TokensHeader.propTypes = componentPropertyTypes;
TokensHeader.defaultProps = defaultProps;

export default TokensHeader;
