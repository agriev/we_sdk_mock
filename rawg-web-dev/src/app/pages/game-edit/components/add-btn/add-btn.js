import React from 'react';
import PropTypes from 'prop-types';
import cn from 'classnames';
import SVGInline from 'react-svg-inline';

import addIcon from 'assets/icons/add.svg';

import './add-btn.styl';

const componentPropertyTypes = {
  readOnly: PropTypes.bool,
  text: PropTypes.node.isRequired,
  onClick: PropTypes.func,
  className: PropTypes.string,
  icon: PropTypes.string,
};

const defaultProps = {
  readOnly: false,
  icon: addIcon,
  className: undefined,
  onClick: undefined,
};

const AddButton = ({ readOnly, text, icon, className, onClick }) => (
  <div className="game-edit__add-btn-container">
    <div
      className={cn('game-edit__add-btn', className, {
        'game-edit__add-btn_readonly': readOnly,
      })}
      onClick={readOnly ? undefined : onClick}
      role="button"
      tabIndex={0}
    >
      <SVGInline svg={icon} />
      {text}
    </div>
  </div>
);

AddButton.propTypes = componentPropertyTypes;
AddButton.defaultProps = defaultProps;

export default AddButton;
