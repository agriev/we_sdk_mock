import React, { Component } from 'react';
import { Link } from 'app/components/link';
import PropTypes from 'prop-types';
import cn from 'classnames';
import memoizeOne from 'memoize-one';
import { hot } from 'react-hot-loader/root';

import isArray from 'lodash/isArray';

import formatNumber from 'tools/format-number';

import Heading from 'app/ui/heading';
import SectionHeading from 'app/ui/section-heading';
import ButtonFollow from 'app/ui/button-follow';
import RenderMounted from 'app/render-props/render-mounted';

import './card-template.styl';

const propTypes = {
  image: PropTypes.node,
  backgroundImage: PropTypes.string,
  backgroundColor: PropTypes.string,
  heading: PropTypes.shape({
    text: PropTypes.string.isRequired,
    path: PropTypes.string.isRequired,
  }).isRequired,
  headingNotice: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.bool]),
  itemsHeading: PropTypes.shape({
    text: PropTypes.node.isRequired,
    count: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  }).isRequired,
  items: PropTypes.arrayOf(
    PropTypes.shape({
      text: PropTypes.string.isRequired,
      path: PropTypes.string.isRequired,
      count: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      countWithIcon: PropTypes.bool,
    }),
  ),
  kind: PropTypes.oneOf(['big', 'medium', 'small']),
  titleCentred: PropTypes.bool,
  className: PropTypes.string,
  itemsValue: PropTypes.oneOf([6, 3]),
  withImage: PropTypes.bool,
  flexibleHeight: PropTypes.bool,
  following: PropTypes.bool,
  onFollowClick: PropTypes.func,
  followLoading: PropTypes.bool,
  item: PropTypes.shape(),
};

const defaultProps = {
  image: undefined,
  backgroundImage: undefined,
  backgroundColor: '#202020',
  headingNotice: '',
  kind: 'big',
  titleCentred: true,
  className: '',
  itemsValue: 3,
  withImage: false,
  flexibleHeight: false,
  following: undefined,
  onFollowClick: undefined,
  followLoading: undefined,
  items: undefined,
  item: undefined,
};

@hot
class CardTemplate extends Component {
  static propTypes = propTypes;

  static defaultProps = defaultProps;

  getBackgroundStyle = memoizeOne((visible) => {
    if (!visible) {
      return undefined;
    }

    const { backgroundImage, backgroundColor } = this.props;
    const style = { backgroundColor };

    if (backgroundImage) {
      const colors = 'rgba(32, 32, 32, 0.5), rgb(32, 32, 32) 70%)';

      style.backgroundImage = `linear-gradient(${colors}, url(${backgroundImage.replace(
        '/media/',
        '/media/resize/640/-/',
      )})`;
    }

    return style;
  });

  onFollowBtnClick = () => {
    this.props.onFollowClick(this.props.item);
  };

  renderHeading() {
    const {
      heading: { text, path },
      headingNotice,
      titleCentred,
      withImage,
    } = this.props;

    const headingClass = cn('card-template__heading-wrapper', {
      'card-template__heading-wrapper_centered': titleCentred,
      'card-template__heading-wrapper_with-notice': !!headingNotice,
    });

    return (
      <div className={headingClass}>
        {withImage && this.renderImage()}
        <Heading rank={4} disabled centred>
          <Link to={path} path={path}>
            {text}
          </Link>
        </Heading>
        {headingNotice && <span className="card-template__heading-notice">{headingNotice}</span>}
      </div>
    );
  }

  renderFollowBtn() {
    const { following, followLoading } = this.props;

    if (following === undefined) {
      return null;
    }

    return (
      <ButtonFollow
        className="card-template__button-follow"
        following={following}
        followLoading={followLoading}
        onClick={this.onFollowBtnClick}
      />
    );
  }

  renderImage() {
    const {
      heading: { path },
      image,
    } = this.props;

    if (!image) {
      return null;
    }

    return (
      <div className="card-template__image-wrapper">
        {image && (
          <Link to={path} path={path}>
            {image}
          </Link>
        )}
      </div>
    );
  }

  renderItem(item) {
    const { text, path, count, countWithIcon } = item;

    const countClass = cn('card-template__count', {
      'card-template__count_icon': countWithIcon,
    });

    return (
      <li className="card-template__item" key={path}>
        <Link to={path} href={path}>
          {text}
        </Link>
        <span className={countClass}>{formatNumber(count)}</span>
      </li>
    );
  }

  renderItems() {
    const { itemsHeading, items, itemsValue } = this.props;
    const listClass = cn('card-template__items-list', {
      'card-template__items-list_big': itemsValue === 6 && items.length > 3,
    });

    if (!isArray(items) || items.length === 0) return null;

    return (
      <div className="card-template__items-wrapper">
        <SectionHeading
          heading={itemsHeading.text}
          count={formatNumber(itemsHeading.count)}
          size="small"
          type="baseline"
        />
        <ul className={listClass}>{items.slice(0, itemsValue).map(this.renderItem)}</ul>
      </div>
    );
  }

  render() {
    const { className, kind, flexibleHeight } = this.props;
    const cardClass = cn('card-template', `card-template_${kind}`, {
      [className]: !!className,
      'card-template_fixed-height': !flexibleHeight,
    });

    return (
      <RenderMounted>
        {({ visible, onChildReference }) => (
          <div
            ref={(element) => onChildReference(element)}
            className={cardClass}
            style={this.getBackgroundStyle(visible)}
          >
            <div className="card-template__first-part">
              {this.renderHeading()}
              {this.renderFollowBtn()}
            </div>
            {this.renderItems()}
          </div>
        )}
      </RenderMounted>
    );
  }
}

export default CardTemplate;
