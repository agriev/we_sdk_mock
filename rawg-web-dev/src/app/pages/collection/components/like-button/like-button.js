import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { hot } from 'react-hot-loader/root';
import { compose } from 'recompose';
import { FormattedMessage } from 'react-intl';
import cn from 'classnames';

import toString from 'lodash/toString';
import len from 'tools/array/len';

import Tooltip from 'app/ui/rc-tooltip';

import './like-button.styl';

const hoc = compose(hot);

const propTypes = {
  disabled: PropTypes.bool,
  onClick: PropTypes.func.isRequired,
  clicksCount: PropTypes.number,
  bigHeadingPosition: PropTypes.bool,
  bigFonts: PropTypes.bool,
  smallFonts: PropTypes.bool,
  verticalLayout: PropTypes.bool,
  usersCount: PropTypes.number,
  showUsersCount: PropTypes.bool,
  showCakeLabel: PropTypes.bool,
  asButton: PropTypes.bool,
  title: PropTypes.string,
};

const defaultProps = {
  disabled: false,
  bigFonts: false,
  smallFonts: false,
  bigHeadingPosition: false,
  verticalLayout: false,
  showCakeLabel: false,
  showUsersCount: false,
  asButton: false,
  usersCount: undefined,
  title: undefined,
};

const CollectionLikeButtonComponent = ({
  disabled,
  bigFonts,
  smallFonts,
  bigHeadingPosition,
  verticalLayout,
  onClick,
  clicksCount,
  usersCount,
  asButton,
  showUsersCount,
  showCakeLabel,
  title,
}) => {
  const clickLettersCount = len(toString(clicksCount));
  const [clicked, setClicked] = useState(false);
  const clickHandler = useCallback(() => {
    if (!clicked) {
      setClicked(true);
    }

    onClick();
  }, [clicked]);

  const renderToolTip = useCallback(() => <span className="collection-like-button__title">{title}</span>, [title]);

  const likeButton = (
    <div className="collection-like-button" onClick={clickHandler} role="button" tabIndex={-1}>
      🍰
      {clicksCount > 0 && (
        <span className="collection-like-button__clicks-counter" data-letters={clickLettersCount}>
          {clicksCount}
        </span>
      )}
    </div>
  );

  return (
    <div
      className={cn('collection-like-button__wrap', {
        'collection-like-button__wrap_as-button': asButton,
        'collection-like-button__wrap_disabled': disabled,
        'collection-like-button__wrap_big-heading-position': bigHeadingPosition,
        'collection-like-button__wrap_big-fonts': bigFonts,
        'collection-like-button__wrap_small-fonts': smallFonts,
        'collection-like-button__wrap_vertical-layout': verticalLayout,
      })}
    >
      {showCakeLabel && (
        <div className="collection-like-button__give-cake-label">
          {!clicked && <FormattedMessage id="collection.give-a-cake" />}
          {clicked && <FormattedMessage id="collection.thank-you" />}
        </div>
      )}
      {!title && likeButton}
      {title && (
        <Tooltip overlayClassName="collection-like-tooltip" trigger={['hover']} placement="top" overlay={renderToolTip}>
          {likeButton}
        </Tooltip>
      )}
      {showUsersCount && usersCount > 0 && (
        <span className="collection-like-button__from-n-players">
          <FormattedMessage id="collection.from-n-players" values={{ count: usersCount }} />
        </span>
      )}
    </div>
  );
};

CollectionLikeButtonComponent.propTypes = propTypes;
CollectionLikeButtonComponent.defaultProps = defaultProps;

const CollectionLikeButton = hoc(CollectionLikeButtonComponent);

export default CollectionLikeButton;
