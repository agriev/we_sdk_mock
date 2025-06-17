/* eslint-disable react/no-danger */

import React from 'react';

import { appLocaleType } from 'app/pages/app/app.types';

const propTypes = {
  appLocale: appLocaleType.isRequired,
};

/**
 * Компонент для поддержки sitelinks searchbox
 * https://developers.google.com/search/docs/data-types/sitelinks-searchbox
 */
const SitelinksSearchbox = ({ appLocale }) => {
  const domain = appLocale === 'ru' ? 'ag.ru' : 'rawg.io';

  const script = `{
    "@context": "http://schema.org",
    "@type": "WebSite",
    "url": "https://${domain}/",
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://${domain}/search?query={search_term_string}",
      "query-input": "required name=search_term_string"
    }
  }`;

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: script }} />;
};

SitelinksSearchbox.propTypes = propTypes;

export default SitelinksSearchbox;
