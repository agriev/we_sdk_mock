import React from 'react';
// import PropTypes from 'prop-types';
import { FormattedMessage, injectIntl } from 'react-intl';
import { Link } from 'app/components/link';
import { compose } from 'recompose';

import paths from 'config/paths';
import id from 'tools/id';

import intlShape from 'tools/prop-types/intl-shape';

import HeaderBrowseLink from './components/header-browse-link';

import '../games-menu/games-menu.styl';
import './browse-menu.styl';

const hoc = compose(injectIntl);

const propTypes = {
  intl: intlShape.isRequired,
};

const getSections = (intl) => [
  {
    name: intl.formatMessage(id('discover.reviews')),
    path: paths.reviews,
  },
  {
    name: intl.formatMessage(id('discover.collections')),
    path: paths.collections,
  },
  {
    name: intl.formatMessage(id('discover.platforms')),
    path: paths.platforms,
  },
  {
    name: intl.formatMessage(id('discover.stores')),
    path: paths.stores,
  },
  {
    name: intl.formatMessage(id('discover.genres')),
    path: paths.genres,
  },
  {
    name: intl.formatMessage(id('discover.creators')),
    path: paths.creators,
  },
  {
    name: intl.formatMessage(id('discover.tags')),
    path: paths.tags,
  },
  {
    name: intl.formatMessage(id('discover.developers')),
    path: paths.developers,
  },
  {
    name: intl.formatMessage(id('discover.publishers')),
    path: paths.publishers,
  },
];

const BrowseMenuPhoneComponent = ({ intl }) => (
  <nav className="games-menu header__browse-menu__phone-links">
    <Link className="header-menu-content__link header-dropdown-content__games-menu-title" to={paths.gamesBrowse}>
      <FormattedMessage id="games.tab_browse" />
    </Link>
    {getSections(intl).map((section) => (
      <HeaderBrowseLink
        key={section.name}
        label={section.name}
        path={section.path}
        className="header-menu-content__link header__browse-menu-phone__link"
      />
    ))}
  </nav>
);

BrowseMenuPhoneComponent.propTypes = propTypes;

const BrowseMenuPhone = hoc(BrowseMenuPhoneComponent);

export default BrowseMenuPhone;
