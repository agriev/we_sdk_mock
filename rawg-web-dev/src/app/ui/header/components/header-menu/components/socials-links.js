import React from 'react';
import { Link } from 'app/components/link';

import toPairs from 'lodash/toPairs';
import includes from 'lodash/includes';

import cond from 'ramda/src/cond';
import equals from 'ramda/src/equals';
import always from 'ramda/src/always';

import appHelper from 'app/pages/app/app.helper';
import SimpleIntlMessage from 'app/components/simple-intl-message/simple-intl-message';

import { appLocaleType } from 'app/pages/app/app.types';

import '../header-menu.styl';

const messageId = cond([
  [equals('discord'), always('shared.social_menu_discord')],
  [equals('twitter_world'), always('shared.social_menu_tw_world')],
  [equals('twitter_pictures'), always('shared.social_menu_tw_pictures')],
  [equals('apidocs'), always('shared.social_menu_apidocs')],
  [equals('leaderboard'), always('shared.social_menu_leaderboard')],
  [equals('sitemap'), always('shared.social_menu_sitemap')],

  [equals('ag_vk'), always('shared.social_menu_ag_vk')],
  [equals('ag_twitter'), always('shared.social_menu_ag_twitter')],
  [equals('ag_facebook'), always('shared.social_menu_ag_facebook')],
  [equals('ag_museum'), always('shared.social_menu_ag_museum')],
  [equals('ag_yandex_zen'), always('shared.social_menu_ag_yandex_zen')],
  [equals('sitemap'), always('shared.social_menu_sitemap')],
]);

const innerLinks = ['leaderboard', 'sitemap', 'apidocs'];
const getTarget = (id) => (includes(innerLinks, id) ? undefined : '_blank');

const propTypes = {
  locale: appLocaleType.isRequired,
};

const SocialsLinks = ({ locale }) => (
  <>
    {toPairs(appHelper.SOCIAL_MENU[locale]).map(([id, url]) => (
      <Link
        key={id}
        to={url}
        target={getTarget(id)}
        rel="nofollow noopener noreferrer"
        className="header-menu-content__settings-link"
      >
        <SimpleIntlMessage id={messageId(id)} />
      </Link>
    ))}
  </>
);

SocialsLinks.propTypes = propTypes;

export default SocialsLinks;
