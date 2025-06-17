import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import SVGInline from 'react-svg-inline';

import copyTextToClipboard from 'tools/copy-to-clipboard';

import checkIcon from 'assets/icons/check.svg';
import copyIcon from 'assets/icons/copy.svg';
import Button from 'app/ui/button';

import './offer-owned.styl';

const componentPropertyTypes = {
  className: PropTypes.string,
};

const defaultProps = {
  className: '',
};

const OfferOwned = ({ className }) => {
  const temporaryCode = '123123';

  return (
    <div className={['offer-owned', className].join(' ')}>
      <h4 className="offer-owned__title">
        <FormattedMessage id="tokens.offerOwned_title" />
        <SVGInline className="offer-owned__check-icon" svg={checkIcon} />
      </h4>
      <p className="offer-owned__text">
        <FormattedMessage id="tokens.offerOwned_text" />
      </p>
      <Button className="offer-owned__button" kind="fill" size="small">
        <FormattedMessage id="tokens.offerOwned_partner_link" />
      </Button>
      <div className="offer-owned__code">
        <FormattedMessage id="tokens.offerOwned_code" />
        <Button
          kind="inline"
          size="small"
          className="offer-owned__code-button"
          onClick={() => copyTextToClipboard(temporaryCode)}
        >
          {temporaryCode}
        </Button>
        <SVGInline className="offer-owned__copy-icon" svg={copyIcon} />
      </div>
    </div>
  );
};

OfferOwned.propTypes = componentPropertyTypes;

OfferOwned.defaultProps = defaultProps;

export default OfferOwned;
