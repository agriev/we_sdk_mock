import React from 'react';
import PropTypes from 'prop-types';
import SimpleIntlMessage from 'app/components/simple-intl-message/simple-intl-message';

import paths from 'config/paths';
import { getItemPath } from 'app/components/card-template/card-template.lib';

import HeaderBrowseLink from '../header-browse-link';

import './section-dropdown-content.styl';

const propTypes = {
  section: PropTypes.shape({
    name: PropTypes.string,
    slug: PropTypes.string,
    items: PropTypes.array,
  }).isRequired,
};

const SectionDropdownContent = ({ section }) => (
  <nav className="header-dropdown-menu-content header-dropdown-menu-content__links">
    <HeaderBrowseLink
      className="header-menu-content__link header__section-dropdown-content__title"
      label={section.name}
      path={paths[section.slug]}
    />

    {section.items.map((item) => (
      <HeaderBrowseLink
        key={item.slug}
        className="header-menu-content__link"
        label={item.name}
        path={getItemPath(section.slug, item.slug)}
      />
    ))}

    <HeaderBrowseLink
      className="header-menu-content__link header__section-dropdown-content__more"
      label={<SimpleIntlMessage id="header.more" />}
      path={paths[section.slug]}
    />
  </nav>
);

SectionDropdownContent.propTypes = propTypes;

export default SectionDropdownContent;
