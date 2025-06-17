import React from 'react';
import { Link } from 'app/components/link';
import { FormattedMessage } from 'react-intl';
import { useSelector } from 'react-redux';

import paths from 'config/paths';

import path from 'ramda/src/path';

import './sitemaps-link.styl';

import HideOnScroll from 'app/render-props/hide-on-scroll';

const SitemapsLink = () => {
  const appLocale = useSelector(path(['app', 'locale'])) || {};

  return (
    <HideOnScroll>
      {(isActive) =>
        isActive && (
          <div className="link-to-sitemap__container">
            <Link to={paths.sitemap(appLocale === 'ru' ? 'А' : 'A')}>
              <FormattedMessage id="shared.social_menu_sitemap" />
            </Link>
          </div>
        )
      }
    </HideOnScroll>
  );
};

export default SitemapsLink;
