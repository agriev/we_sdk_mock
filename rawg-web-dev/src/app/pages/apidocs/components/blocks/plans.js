import React from 'react';
import PropTypes from 'prop-types';

import SVGInline from 'react-svg-inline';
import Slider from 'app/ui/slider';
import checkIcon from '../../assets/check.svg';

const plans = [
  {
    name: 'Free',
    key: 'free',
    description: 'For personal and hobby projects',
    variant: 'black',
    benefits: [
      'Non-commercial projects only',
      '500,000+ video games data',
      'up to 20,000 requests per month',
      'Required backlinks to RAWG from pages where the data is used',
    ],
  },
  {
    name: 'Business',
    key: 'business',
    description: 'For small and mid-size companies',
    price: '$149/m.',
    variant: 'primary',
    benefits: [
      'All in Free Plan',
      'Commercial use',
      'Where to buy links',
      'Similar games',
      'Gameplay videos, relevant twitch and youtube videos',
      'up to 50,000 requests per month',
      'Email support',
    ],
  },
  {
    name: 'Enterprise',
    key: 'enterprise',
    description: 'For projects with custom needs',
    variant: 'white',
    benefits: [
      'All in Business Plan',
      'Downloadable file api',
      'up to 1,000,000 requests per month',
      'Custom data requests',
      'Priority email support',
    ],
  },
];

const renderBenefit = (text, index) => (
  <li className="plan__benefit" key={index}>
    <SVGInline className="plan__benefit-icon" svg={checkIcon} />
    {text}
  </li>
);

const signUpLink = (
  <a href="/signup" target="_blank" rel="noopener noreferrer">
    sign up
  </a>
);

const renderSignUp = () => (
  <div className="apidocs-plans__sign-up">
    <a className="apidocs-button apidocs-button_disabled" disabled>
      Get started
    </a>
    <p className="apidocs-plans__hint">You must {signUpLink} first</p>
  </div>
);

const renderPlan = ({ name, key, description, benefits, price, variant, plansOptions, isAuthenticatedUser }) => (
  <div className="apidocs-plans__plan-wrap" key={name}>
    <div className={`plan apidocs-plans__plan _${variant}`}>
      {price && <span className="plan__price">{price}</span>}
      <h3 className="plan__title">{name}</h3>
      <p className="plan__description apidocs-lead">{description}</p>
      {!isAuthenticatedUser && key === 'business' ? (
        renderSignUp()
      ) : (
        <a
          className="apidocs-button"
          href={plansOptions[key].url}
          rel="noopener noreferrer"
          onClick={() => plansOptions[key].onClick && plansOptions[key].onClick()}
        >
          {plansOptions[key].buttonText}
        </a>
      )}
      <ul className="plan__benefits">{benefits.map(renderBenefit)}</ul>
    </div>
  </div>
);

renderPlan.propTypes = {
  name: PropTypes.string.isRequired,
  key: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  benefits: PropTypes.any.isRequired,
  price: PropTypes.string.isRequired,
  variant: PropTypes.string.isRequired,
  plansOptions: PropTypes.object.isRequired,
  isAuthenticatedUser: PropTypes.bool.isRequired,
};

export const getBlockPlans = ({ plansOptions, isAuthenticatedUser, isPhone = false }) => (
  <div id="pricing" className="apidocs-plans">
    <h2 className="apidocs-plans__title apidocs-h2">Ready to start?</h2>
    <div className="apidocs-plans__list">
      <Slider
        arrows={false}
        adaptiveHeight={false}
        infinite={false}
        variableWidth
        slidesToScroll={1}
        slidesToShow={isPhone ? 1 : 3}
        initialSlide={1}
        swipeToSlide
        centerMode
      >
        {plans.map((p) => renderPlan({ ...p, plansOptions, isAuthenticatedUser }))}
      </Slider>
    </div>
  </div>
);

getBlockPlans.propTypes = {
  isPhone: PropTypes.bool.isRequired,
  plansOptions: PropTypes.object.isRequired,
  isAuthenticatedUser: PropTypes.bool.isRequired,
};
