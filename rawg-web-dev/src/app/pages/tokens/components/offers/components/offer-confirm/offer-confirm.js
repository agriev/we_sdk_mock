import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { Link } from 'app/components/link';
import { reduxForm, Field, propTypes as formPropertyTypes } from 'redux-form';

import paths from 'config/paths';
import config from 'config/config';

import Button from 'app/ui/button';
import Input from 'app/ui/input';
import Error from 'app/ui/error';

import OfferPrice from '../../../offer-price/offer-price';
import OfferOwned from '../offer-owned/offer-owned';

import './offer-confirm.styl';

const componentPropertyTypes = {
  className: PropTypes.string,
  ...formPropertyTypes,
};

const defaultProps = {
  className: '',
};

class OfferConfirm extends Component {
  static propTypes = componentPropertyTypes;

  constructor(props) {
    super(props);

    this.state = {
      isConfirmed: false,
    };
  }

  confirmPasswordHandler = () => {
    this.setState({
      isConfirmed: true,
    });
  };

  render() {
    const { className, cancelHandler, error, handleSubmit, submitting } = this.props;
    const { isConfirmed } = this.state;

    return isConfirmed ? (
      <OfferOwned />
    ) : (
      <div className={['offer-confirm', className].join(' ')}>
        <h4 className="offer-confirm__title">
          <FormattedMessage id="tokens.offerConfirm_title" />
        </h4>
        <p className="offer-confirm__text">
          <FormattedMessage id="tokens.offerConfirm_text" />
        </p>
        <div className="offer-confirm__input-wrap">
          <div className="offer-confirm__label">
            <FormattedMessage id="tokens.offerConfirm_password" />
          </div>
          <Button kind="inline" size="small" className="offer-confirm__cancel" onClick={cancelHandler}>
            <FormattedMessage id="shared.cancel" />
          </Button>
        </div>
        <form method="post" onSubmit={handleSubmit(this.confirmPasswordHandler)}>
          <Field type="password" name="password" placeholder="Password" component={Input} />
          {error && error.map((e) => <Error error={e} kind="form" key={e} />)}
          <Button
            type="submit"
            className="offer-confirm__button"
            kind="fill"
            size="small"
            loading={submitting}
            disabled={submitting}
          >
            <FormattedMessage id="tokens.offerConfirm_get_for" />
            <OfferPrice price={70} className="offer-confirm__price" />
          </Button>
        </form>
        <div className="offer-confirm__balance-wrap">
          <FormattedMessage id="tokens.offerConfirm_balance" />
          <OfferPrice price={105} className="offer-confirm__balance" />
          {config.features.tokensExchange && (
            <Link className="offer-confirm__link" to={paths.tokensExchange} href={paths.tokensExchange}>
              <FormattedMessage id="tokens.offerConfirm_exchange" />
            </Link>
          )}
        </div>
      </div>
    );
  }
}

OfferConfirm.propTypes = componentPropertyTypes;

OfferConfirm.defaultProps = defaultProps;

export default reduxForm({
  form: 'confirm-with-pass',
  persistentSubmitErrors: true,
})(OfferConfirm);
