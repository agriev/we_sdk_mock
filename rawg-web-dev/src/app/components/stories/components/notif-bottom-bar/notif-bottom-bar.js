import React from 'react';
import { Link as ScrollLink } from 'react-scroll';

import SimpleIntlMessage from 'app/components/simple-intl-message';

import './notif-bottom-bar.styl';

const StoriesInfoNotifBottomBar = () => (
  <ScrollLink className="stories__notif-bottom-bar" to="showcase.recent-games" duration={0} smooth spy>
    <SimpleIntlMessage id="stories.notif-bottom" />
  </ScrollLink>
);

export default StoriesInfoNotifBottomBar;
