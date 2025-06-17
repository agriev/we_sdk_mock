import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import debounce from 'lodash/debounce';

import Dropdown from 'app/ui/dropdown';

import paths from 'config/paths';

import DottedLabel from './components/dotted-label';
import HeaderBrowseLink from './components/header-browse-link';
import SectionDropdownContent from './components/section-dropdown-content';
import getVisibleSectionsCount from './browse-menu.helper';

import './browse-menu.styl';

export const propTypes = {
  sections: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  showMyGamesBadge: PropTypes.bool.isRequired,
  userLogged: PropTypes.bool.isRequired,
};

export const connector = (state) => ({
  sections: state.browse.fullCase.items,
});

@connect(connector)
export default class BrowseMenu extends Component {
  static propTypes = propTypes;

  constructor(...arguments_) {
    super(...arguments_);

    const { showMyGamesBadge, userLogged } = this.props;

    this.recalcDebounced = debounce(this.recalc, 200);

    this.state = {
      visibleSectionCount: getVisibleSectionsCount({ showMyGamesBadge, userLogged }),
    };
  }

  componentDidMount() {
    this.recalc();

    window.addEventListener('resize', this.recalcDebounced);
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.recalcDebounced);
  }

  /* eslint-disable-next-line react/sort-comp */
  recalc = () => {
    const { showMyGamesBadge, userLogged } = this.props;

    this.setState({
      visibleSectionCount: getVisibleSectionsCount({ showMyGamesBadge, userLogged }),
    });
  };

  renderMoreDropdown() {
    const { sections } = this.props;
    const { visibleSectionCount } = this.state;

    const button = (
      <HeaderBrowseLink
        label={<DottedLabel label="" />}
        path={paths.gamesBrowse}
        className="header__item-link header__browse-menu__section-title"
      />
    );

    const content = (
      <nav className="header-dropdown-menu-content header-dropdown-menu-content__links">
        {sections.slice(visibleSectionCount).map((section) => (
          <HeaderBrowseLink
            key={section.slug}
            className="header-menu-content__link"
            label={section.name}
            path={paths[section.slug]}
          />
        ))}
      </nav>
    );

    return (
      <Dropdown
        isMouseOver
        closeOnClick
        renderedButton={button}
        renderedContent={content}
        containerClassName="header-dropdown-menu__games-dropdown-container"
      />
    );
  }

  render() {
    const { sections } = this.props;
    const { visibleSectionCount } = this.state;
    const button = (section) => (
      <HeaderBrowseLink
        key={section.slug}
        label={section.name}
        path={paths[section.slug]}
        className="header__item-link header__browse-menu__section-title"
      />
    );

    return (
      <nav className="header__browse-menu">
        {sections.slice(0, visibleSectionCount).map((section) => (
          <Dropdown
            key={section.slug}
            isMouseOver
            closeOnClick
            renderedButton={button(section)}
            renderedContent={<SectionDropdownContent section={section} />}
            containerClassName="header-dropdown-menu__games-dropdown-container"
          />
        ))}

        {visibleSectionCount < sections.length && this.renderMoreDropdown()}
      </nav>
    );
  }
}
