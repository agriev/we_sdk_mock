import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'app/components/link';
import cn from 'classnames';
import SVGInline from 'react-svg-inline';

import './signup-card.styl';

import paths from 'config/paths';
import { setSocialAuthFromRateCardsBegin, setSocialAuthFromRateCardsEnd } from 'app/pages/app/app.actions';

import SimpleIntlMessage from 'app/components/simple-intl-message';

import Heading from 'app/ui/heading/heading';
import RegisterForm from 'app/pages/register/register-form';
import SocialAccountsAuthBlock from 'app/components/social-accounts/social-accounts-auth-block';

import checkedIcon from 'assets/icons/checked-15.svg';

import currentUserType from 'app/components/current-user/current-user.types';
import locationShape from 'tools/prop-types/location-shape';

const propTypes = {
  location: locationShape.isRequired,
  centred: PropTypes.bool,
  isActive: PropTypes.bool,
  dispatch: PropTypes.func.isRequired,
  title: PropTypes.node,
  className: PropTypes.string,
  currentUser: currentUserType.isRequired,
};

const defaultProps = {
  centred: false,
  isActive: true,
  title: null,
  className: undefined,
};

class SignupCard extends Component {
  static propTypes = propTypes;

  static defaultProps = defaultProps;

  componentDidMount() {
    this.props.dispatch(setSocialAuthFromRateCardsBegin());
  }

  componentWillUnmount() {
    this.props.dispatch(setSocialAuthFromRateCardsEnd());
  }

  getCardClassName = () => {
    const { centred, isActive, className } = this.props;

    return cn('signup-card', {
      'signup-card_active': isActive,
      'signup-card_centred': centred,
      [className]: !!className,
    });
  };

  renderTitle() {
    return (
      <Heading className="signup-card__title" rank={3} centred disabled>
        <SimpleIntlMessage id="register.title" />
        <SimpleIntlMessage className="signup-card__emphasis" id="register.save_rating" />
      </Heading>
    );
  }

  renderSignupForm = () => {
    const { location, title, isActive } = this.props;

    return (
      <div className={this.getCardClassName()}>
        <div className="signup-card__wrapper">
          {title || this.renderTitle()}
          <div className="signup-card__columns">
            <div className="signup-card__form">
              <RegisterForm location={location} redirect={false} />
              <div className="signup-card__login">
                <Link
                  to={`${paths.login}?closeAfterSuccess=true`}
                  rel="nofollow"
                  target="_blank"
                  onClick={this.onLoginClick}
                >
                  <SimpleIntlMessage id="register.additional" />
                </Link>
              </div>
            </div>
            <div className="signup-card__socials">
              <Heading rank={4} centred disabled>
                <SimpleIntlMessage className="signup-card__subtitle" id="register.info" />
              </Heading>
              <SocialAccountsAuthBlock location={location} active={isActive} context="register" />
            </div>
          </div>
        </div>
      </div>
    );
  };

  renderSuccessRegister = () => {
    const { currentUser } = this.props;
    return (
      <div className={this.getCardClassName()}>
        <div className="signup-card__wrapper signup-card__wrapper_success">
          <SVGInline className="signup-card__check-icon" svg={checkedIcon} />
          <div className="signup-card__success-text">
            Your RAWG profile{' '}
            <Link to={paths.profile(currentUser.slug)}>{currentUser.full_name || currentUser.username}</Link> has been
            created and all your ratings are now saved!
          </div>
        </div>
      </div>
    );
  };

  render() {
    const { currentUser } = this.props;

    if (currentUser.id) {
      return this.renderSuccessRegister();
    }

    return this.renderSignupForm();
  }
}

export default SignupCard;
