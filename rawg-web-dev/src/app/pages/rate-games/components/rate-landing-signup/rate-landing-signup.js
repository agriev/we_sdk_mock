import React from 'react';
import PropTypes from 'prop-types';

import paths from 'config/paths';
import trans from 'tools/trans';

import locationShape from 'tools/prop-types/location-shape';

import Heading from 'app/ui/heading/heading';
import SignupCard from 'app/components/signup-card';

import largeTitleEn from 'app/pages/rate-games/assets/en/sign-up.svg';
import smallTitleEn from 'app/pages/rate-games/assets/en/to-save-your-ratings.svg';

import largeTitleRu from 'app/pages/rate-games/assets/ru/sign-up.svg';
import smallTitleRu from 'app/pages/rate-games/assets/ru/to-save-your-ratings.svg';

import './rate-landing-signup.styl';

import currentUserType from 'app/components/current-user/current-user.types';
import { appLocaleType } from 'app/pages/app/app.types';

const propTypes = {
  dispatch: PropTypes.func.isRequired,
  location: locationShape.isRequired,
  currentUser: currentUserType.isRequired,
  locale: appLocaleType.isRequired,
};

const defaultProps = {};

// eslint-disable-next-line react/prop-types
const Title = ({ locale }) => {
  const isEn = locale === 'en';

  return (
    <div className="rate-landing-signup__head">
      <Heading className="rate-landing-signup__heading" rank={2} centred disabled>
        <img
          className="rate-landing-signup__large-heading"
          src={paths.svgImagePath(isEn ? largeTitleEn : largeTitleRu)}
          width="512"
          alt="Sign up"
        />
        <img
          className="rate-landing-signup__small-heading"
          src={paths.svgImagePath(isEn ? smallTitleEn : smallTitleRu)}
          width="384"
          alt="to save your ratings"
        />
      </Heading>
      <span className="rate-landing-signup__subheading">{trans('register.join_text')}</span>
    </div>
  );
};

class RateLandingSignup extends React.Component {
  constructor(props, context) {
    super(props, context);

    this.state = {
      doNotRender: !!this.props.currentUser.id,
    };
  }

  render() {
    const { location, dispatch, currentUser, locale } = this.props;
    const { doNotRender } = this.state;

    if (doNotRender) {
      return null;
    }

    return (
      <SignupCard
        currentUser={currentUser}
        className="rate-landing-signup"
        location={location}
        dispatch={dispatch}
        title={<Title locale={locale} />}
        centred
      />
    );
  }
}

RateLandingSignup.propTypes = propTypes;
RateLandingSignup.defaultProps = defaultProps;

export default RateLandingSignup;
