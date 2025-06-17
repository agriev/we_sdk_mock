/* eslint-disable jsx-a11y/anchor-has-content, jsx-a11y/anchor-is-valid */

import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { injectIntl } from 'react-intl';
import { withRouter } from 'react-router';
import { compose } from 'recompose';
import { hot } from 'react-hot-loader/root';
import { appLocaleType } from 'app/pages/app/app.types';
import locationShape from 'tools/prop-types/location-shape';

import './apidocs.styl';

import prepare from 'tools/hocs/prepare';
import appHelper from 'app/pages/app/app.helper';
import HelmetDisplayer from 'app/ui/page/components/helmet-displayer';
import currentUserType from 'app/components/current-user/current-user.types';
import user from 'app/components/current-user/current-user.helper';
import { goToManageSubscription, goToPaymentForm } from 'app/components/api-subscription/api-subscription.actions';

import ApidocsHeader from './components/apidocs-header';
import ApidocsFooter from './components/apidocs-footer';

import { blockMain } from './components/blocks/main';
import { blockApiKeyExample } from './components/blocks/apikey-example';
import { blockReasons } from './components/blocks/reasons';

import { getBlockPlans } from './components/blocks/plans';
import { getBlockPartners } from './components/blocks/partners';
import { getBlockTerms } from './components/blocks/terms';

import { blockLatestUpdates } from './components/blocks/latest-updates';
import { getBlockApiWrappers } from './components/blocks/api-wrappers';
import { blockExamples } from './components/blocks/examples';

const hoc = compose(
  hot,
  prepare(),
  injectIntl,
  withRouter,
  connect((state) => ({
    size: state.app.size,
    locale: state.app.locale,
    currentUser: state.currentUser,
  })),
);

const componentPropertyTypes = {
  size: PropTypes.string.isRequired,
  dispatch: PropTypes.func.isRequired,
  locale: appLocaleType.isRequired,
  location: locationShape.isRequired,
  currentUser: currentUserType.isRequired,
};

const ApidocsComponent = ({ size, location, dispatch, locale, currentUser }) => {
  const rawgEmail = <a href="mailto:api@rawg.io">api@rawg.io</a>;
  const isPhone = appHelper.isPhoneSize({ size });

  const isAuthenticatedUser = user.isAuthenticated(currentUser);
  const isBusinessUser = user.isBusiness(currentUser);

  const plansOptions = {
    free: {
      buttonText: 'Get API Key',
      url: user.getDeveloperURL(currentUser),
    },
    business: {
      buttonText: isBusinessUser ? 'Manage subscription' : 'Get started',
      onClick: () => {
        if (!isAuthenticatedUser) {
          return;
        }

        if (!isBusinessUser) {
          dispatch(goToPaymentForm());
          return;
        }

        dispatch(goToManageSubscription());
      },
    },
    enterprise: {
      buttonText: 'Contact us',
      url: 'mailto:api@rawg.io?subject=Enterprise plan request',
    },
  };

  return (
    <div className="apidocs">
      <HelmetDisplayer
        location={location}
        dispatch={dispatch}
        locale={locale}
        title="Explore RAWG Video Games Database API"
      />
      <div className="apidocs__container">
        <div className="apidocs__content">
          <ApidocsHeader />
          {blockMain({ apiKeyUrl: plansOptions.free.url })}
          {blockApiKeyExample}
          {blockReasons}
        </div>
      </div>
      <div className="apidocs__container _dark">
        {getBlockPlans({ isPhone, plansOptions, isAuthenticatedUser })}
        {getBlockPartners({ isPhone })}
        {getBlockTerms({ rawgEmail })}
      </div>
      <div className="apidocs__container">
        <div className="apidocs__content">
          {blockLatestUpdates}
          {getBlockApiWrappers({ isPhone, rawgEmail })}
          {blockExamples}
          <ApidocsFooter />
        </div>
      </div>
    </div>
  );
};

ApidocsComponent.propTypes = componentPropertyTypes;

const Apidocs = hoc(ApidocsComponent);

export default Apidocs;
