import React from 'react';
import { Link } from 'app/components/link';
import PropTypes from 'prop-types';
import cn from 'classnames';

import noop from 'lodash/noop';

import formatNumber from 'tools/format-number';
import SimpleIntlMessage from 'app/components/simple-intl-message/simple-intl-message';
import HiddenLink from 'app/ui/hidden-link';

import { appLocaleType } from 'app/pages/app/app.types';

import './subpage-menu.styl';

const SubpageMenuPropertyTypes = {
  locale: appLocaleType.isRequired,
  titles: PropTypes.arrayOf(
    PropTypes.shape({
      path: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      disabled: PropTypes.bool,
    }),
  ).isRequired,
  currentPath: PropTypes.string,
};

const SubpageMenuDefaultTypes = {
  currentPath: undefined,
};

const SubpageMenu = ({ locale, titles, currentPath }) => (
  <nav className="subpage-menu">
    <ul className="subpage-menu__links">
      {titles.map((title) => {
        const { checkActive = noop, path, name, count } = title;
        const LinkTag = title.disabled ? 'div' : Link;

        if (title.locale && locale !== title.locale) {
          return null;
        }

        const active = checkActive(currentPath) || path === currentPath;

        return (
          <li className="subpage-menu__link-wrap" key={title.name} title={title.title}>
            {active && <SimpleIntlMessage id={title.name} className="subpage-menu__link_active" />}
            {!active &&
              (title.hiddenFromRobots ? (
                <HiddenLink to={path} className="subpage-menu__link" activeClassName="subpage-menu__link_active">
                  <SimpleIntlMessage id={name} />
                </HiddenLink>
              ) : (
                <LinkTag
                  className="subpage-menu__link"
                  activeClassName="subpage-menu__link_active"
                  to={path}
                  onlyActiveOnIndex
                >
                  <SimpleIntlMessage id={name} />
                </LinkTag>
              ))}
            {!!count && count > 0 && (
              <span
                className={cn('subpage-menu__counter', {
                  'subpage-menu__counter-active': currentPath === path,
                })}
              >
                {` ${formatNumber(count)}`}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  </nav>
);

SubpageMenu.propTypes = SubpageMenuPropertyTypes;
SubpageMenu.defaultProps = SubpageMenuDefaultTypes;

export default SubpageMenu;
