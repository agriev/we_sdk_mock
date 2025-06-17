import React from 'react';
import { Link } from 'app/components/link';
import { FormattedMessage } from 'react-intl';

import paths from 'config/paths';
import { appLocaleType } from 'app/pages/app/app.types';

const propTypes = {
  locale: appLocaleType.isRequired,
};

const AddContent = ({ locale }) => (
  <div className="header-dropdown-menu-content header-dropdown-menu-content__links">
    <Link className="header-menu-content__add-link" to={paths.search()}>
      <div className="header__add-game-to-library-icon" />
      <FormattedMessage id="shared.header_menu_add_game" />
    </Link>
    {locale === 'en' && (
      <Link className="header-menu-content__add-link" to={paths.gameCreateBasic}>
        <div className="header__add-missing-game-icon" />
        <FormattedMessage id="game_edit.header_menu_add_missing_game" />
      </Link>
    )}
    <Link className="header-menu-content__add-link" to={paths.collectionCreate}>
      <div className="header__add-game-to-collection-icon" />
      <FormattedMessage id="shared.header_menu_add_collection" />
    </Link>
  </div>
);

AddContent.propTypes = propTypes;

export default AddContent;
