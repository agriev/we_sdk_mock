/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import cn from 'classnames';
import { injectIntl } from 'react-intl';

import './select-content.styl';

import truncate from 'lodash/truncate';
import debounce from 'lodash/debounce';
import noop from 'lodash/noop';

import intlShape from 'tools/prop-types/intl-shape';

import styleVars from 'styles/vars.json';

import MaybeLinkable from '../maybe-linkable';

export const selectContentPropTypes = {
  title: PropTypes.string,
  items: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      value: PropTypes.string,
      collection: PropTypes.string,
      active: PropTypes.bool,
      clean: PropTypes.bool,
      childs: PropTypes.array,
    }),
  ),
  multiple: PropTypes.bool,
  link: PropTypes.shape({}),
  search: PropTypes.bool,
  saveActive: PropTypes.bool,
  forceClean: PropTypes.bool,
  className: PropTypes.string,
  onChange: PropTypes.func,
  onChangeChild: PropTypes.func,
  onSearch: PropTypes.func,
  intl: intlShape,
  tructateTitles: PropTypes.number,
  linkable: PropTypes.oneOfType([PropTypes.bool, PropTypes.string]),
  urlBase: PropTypes.string,
  filters: PropTypes.shape(),
};

const selectContentDefaultProperties = {
  title: undefined,
  multiple: false,
  link: undefined,
  search: false,
  saveActive: true,
  forceClean: false,
  className: '',
  onChange: undefined,
  onChangeChild: undefined,
  onSearch: noop,
  items: [],
  intl: undefined,
  tructateTitles: undefined,
  linkable: false,
  urlBase: undefined,
  filters: undefined,
};

@injectIntl
export default class SelectContent extends Component {
  static propTypes = selectContentPropTypes;

  static defaultProps = selectContentDefaultProperties;

  constructor(props) {
    super(props);

    this.state = {
      searchValue: '',
      selectedParent: undefined,
    };

    this.sendInputchangedEvent = debounce(this.sendInputchangedEvent, 500);
  }

  componentDidMount() {
    this.mediaChanged = window.matchMedia(styleVars.bp.desktop);
    this.mediaChanged.addListener(this.onMediaChange);
  }

  componentWillUnmount() {
    this.mediaChanged.removeListener(this.onMediaChange);
  }

  onMediaChange = () => {
    if (this.state.selectedParent !== undefined) {
      this.setState({
        selectedParent: undefined,
      });
    }
  };

  get className() {
    const { className } = this.props;

    return cn('select-content', {
      [className]: className,
    });
  }

  handleClick = (clickedItemArgument) => {
    const clickedItem = clickedItemArgument;
    const { items } = this.props;
    const { multiple, onChange } = this.props;

    if (typeof onChange !== 'function') {
      return;
    }

    let activeItems;

    if (clickedItem.clean) {
      activeItems = [];
    } else if (multiple) {
      clickedItem.active = !clickedItem.active;
      activeItems = items.filter((item) => item.active === true);
    } else {
      activeItems = [clickedItem];
      clickedItem.active = true;
    }

    onChange({ activeItems, clickedItem, isClean: Boolean(clickedItem.clean) });

    this.setState({
      selectedParent: undefined,
    });
  };

  handleChildClick = (clickedItemArgument) => {
    const clickedItem = clickedItemArgument;
    const { items, multiple, onChangeChild } = this.props;
    const hasThatChild = (itm) => itm.childs && itm.childs.some((child) => child.id === clickedItem.id);
    const parentItem = items.find(hasThatChild);

    if (typeof onChangeChild !== 'function') {
      return;
    }

    let activeChilds = [];

    if (multiple) {
      clickedItem.active = !clickedItem.active;
      activeChilds = parentItem.childs.filter((item) => Boolean(item.active));
    } else {
      activeChilds = [clickedItem];
      clickedItem.active = true;
    }

    onChangeChild({
      activeChilds,
      parentItem,
      clickedItem,
    });

    this.setState({
      selectedParent: undefined,
    });
  };

  handleBackClick = () => {
    this.setState({
      selectedParent: undefined,
    });
  };

  handleSelectParent = (item) => {
    if (item.childs) {
      this.setState({
        selectedParent: item,
      });
    } else {
      this.handleClick(item);
    }
  };

  onInput = (e) => {
    const { value } = e.target;

    this.setState({ searchValue: value });

    this.sendInputchangedEvent(value);
  };

  sendInputchangedEvent = (value) => {
    this.props.onSearch(value);
  };

  truncate = (string) => {
    if (this.props.tructateTitles) {
      return truncate(string, this.props.tructateTitles);
    }
    return string;
  };

  hasActiveItems = () =>
    this.props.items.some(
      (element) => element.active || (element.childs && element.childs.some((chld) => chld.active)),
    );

  renderItem = (item) => {
    const { intl, saveActive, forceClean, linkable, urlBase, filters } = this.props;
    const { id, value, active, clean, childs } = item;

    if (clean && !this.hasActiveItems() && !forceClean) {
      return null;
    }

    const hasActiveChilds = childs && childs.some((child) => Boolean(child.active));
    const valueString = this.truncate(value);
    const className = cn('select-content__item', {
      'select-content__item_active': active,
      'select-content__item_clean': clean,
    });

    const selectedIcon = saveActive && (active || hasActiveChilds) && (
      <div
        className={cn('select-content__icon', {
          'select-content__icon__childs': !active && hasActiveChilds,
        })}
      />
    );

    return (
      <li className={className} key={id}>
        <MaybeLinkable filters={filters} linkable={linkable} item={item} urlBase={urlBase}>
          <div
            className={cn('select-content__item__main', {
              'select-content__disabled': item.empty,
            })}
          >
            <span
              className="select-content__item__main__desktop"
              onClick={() => this.handleClick(item)}
              role="button"
              tabIndex={0}
            >
              {valueString}
              {selectedIcon}
            </span>
            <span
              className={cn('select-content__item__main__phone', {
                'select-content__item__main__phone--with-check': saveActive && (active || hasActiveChilds),
              })}
              onClick={() => this.handleSelectParent(item)}
              role="button"
              tabIndex={0}
            >
              {valueString}
              {selectedIcon}
            </span>
            {childs && <div className="select-content__icon__has_childs" />}
          </div>
        </MaybeLinkable>
        {childs && (
          <div className="select-content__item__childs">
            {childs.map((child) => (
              <MaybeLinkable linkable={linkable} item={child} key={child.id} urlBase={urlBase} filters={filters}>
                <div
                  className={cn('select-content__item__child', {
                    'select-content__disabled': child.empty,
                  })}
                  onClick={() => this.handleChildClick(child)}
                  role="button"
                  tabIndex={0}
                >
                  {this.truncate(child.value)}
                  {saveActive && child.active && <div className="select-content__icon" />}
                </div>
              </MaybeLinkable>
            ))}
            <MaybeLinkable filters={filters} linkable={linkable} item={item} urlBase={urlBase}>
              <div
                className="select-content__item__child select-content__item__child__select-all"
                onClick={() => this.handleClick(item)}
                role="button"
                tabIndex={0}
              >
                {intl.formatMessage({ id: 'shared.select_all' })}
              </div>
            </MaybeLinkable>
          </div>
        )}
      </li>
    );
  };

  renderItemChilds(item) {
    const { intl, saveActive, linkable, urlBase, filters } = this.props;
    const { active, childs } = item;
    const className = cn('select-content__item', {
      'select-content__item_active': active,
    });

    const children = childs.map((child) => (
      <li key={child.id} className={className}>
        <MaybeLinkable filters={filters} linkable={linkable} item={child} urlBase={urlBase}>
          <div className="select-content__item__main">
            <span
              className={cn('select-content__item__main__phone', {
                'select-content__item__main__phone--with-check': saveActive && child.active,
              })}
              onClick={() => this.handleChildClick(child)}
              role="button"
              tabIndex={0}
            >
              {this.truncate(child.value)}
              {saveActive && child.active && <div className="select-content__icon" />}
            </span>
          </div>
        </MaybeLinkable>
      </li>
    ));

    const selectAll = (
      <li key="select-all" className="select-content__item select-content__item-select-all">
        <div onClick={() => this.handleClick(item)} role="button" tabIndex={0}>
          {intl.formatMessage({ id: 'shared.select_all' })}
        </div>
      </li>
    );

    const back = (
      <li key="back" className="select-content__item select-content__item-back">
        <div onClick={() => this.handleBackClick()} role="button" tabIndex={0}>
          {intl.formatMessage({ id: 'shared.back' })}
        </div>
      </li>
    );

    return [...children, selectAll, back];
  }

  render() {
    const { selectedParent, searchValue } = this.state;
    const { items, title, search, link } = this.props;

    const titleString = selectedParent ? selectedParent.value : title;

    return (
      <ul className={this.className}>
        {title && <div className="select-content__title">{titleString}</div>}
        {link && <div className="select-content__item select-content__item_link">{link}</div>}

        {search && (
          <div className="select-content__search">
            <input className="select-content__input" value={searchValue} placeholder="Search" onChange={this.onInput} />
          </div>
        )}
        {selectedParent === undefined && items.map(this.renderItem)}
        {selectedParent && this.renderItemChilds(selectedParent)}
      </ul>
    );
  }
}
