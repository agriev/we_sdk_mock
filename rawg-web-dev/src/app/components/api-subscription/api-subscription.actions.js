/* eslint-disable no-console */
import { replace } from 'react-router-redux';

import fetch from 'tools/fetch';
import user from 'app/components/current-user/current-user.helper';

import { getStripe } from './stripe';

export function goToPaymentForm() {
  return async (dispatch, getState) => {
    const state = getState();
    if (user.isBusiness(state.currentUser)) {
      dispatch(replace(user.getDeveloperURL(state.currentUser)));
      return;
    }

    const [stripe, { sessionId }] = await Promise.all([
      getStripe(),
      fetch('/api/stripe/create-checkout-session', {
        method: 'post',
        data: {},
        state,
      }),
    ]);
    stripe.redirectToCheckout({ sessionId });
  };
}

export function goToManageSubscription() {
  return async (dispatch, getState) => {
    const state = getState();
    const { url } = await fetch('/api/stripe/customer-portal', {
      method: 'post',
      data: {},
      state,
    });
    window.location.href = url;
  };
}
