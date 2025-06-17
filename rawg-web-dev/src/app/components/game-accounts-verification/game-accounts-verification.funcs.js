/* eslint-disable import/prefer-default-export */

import paths from 'config/paths';
import getSiteUrl from 'tools/get-site-url';

export function getVerificationCode(user, appLocale) {
  const siteUrl = getSiteUrl(appLocale);

  return `${siteUrl}${paths.profile(user.slug)}`;
}
