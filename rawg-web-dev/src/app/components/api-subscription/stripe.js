import { loadStripe } from '@stripe/stripe-js/pure';

import env from 'config/env';
import appHelper from 'app/pages/app/app.helper';

const PUBLIC_KEY_TEST =
  'pk_test_51IIVYHHHMeRrLb2tCx0IuIBnALuxt7XtXX7XJ78K1ArIHlqPmO201lbZ32hFGK7vZ4oCO7AJkRTiSANdeWPPClwR00DdvGEyYk';
const PUBLIC_KEY_PROD =
  'pk_live_51IIVYHHHMeRrLb2tGR1Mc5yP1SCTn1C5D4wY26BZDc8dAtNxC9aJNFHr1tLdEhJYKeUvxAWyymbaNyvIr5UjULKP00tluPSLEC';

export function getStripe() {
  if (env.isClient()) {
    const publicKey = appHelper.isStageWebsite(window.location.host) ? PUBLIC_KEY_TEST : PUBLIC_KEY_PROD;
    return loadStripe(publicKey);
  }
}
