import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { hot } from 'react-hot-loader';
import { compose } from 'recompose';
import SimpleIntlMessage from 'app/components/simple-intl-message';
import cn from 'classnames';
import SVGInline from 'react-svg-inline';

import helpIcon from 'assets/icons/help.svg';

import './control-group.styl';

const hoc = compose(hot(module));

const componentPropertyTypes = {
  children: PropTypes.oneOfType([PropTypes.func, PropTypes.node]).isRequired,
  title: PropTypes.string,
  className: PropTypes.string,
  withQuestion: PropTypes.bool,
  beforeContent: PropTypes.node,
};

const defaultProps = {
  title: undefined,
  className: undefined,
  withQuestion: false,
  beforeContent: undefined,
};

const ControlGroupComponent = ({ children, title, className, withQuestion, beforeContent }) => {
  const [showHelp, setShowHelp] = useState(true);
  const onQuestionClick = useCallback(() => {
    setShowHelp(!showHelp);
  }, [showHelp]);

  return (
    <div className={cn('game-edit__control-group', className)}>
      {title && (
        <div className="game-edit__control-group-title">
          <div className="game-edit__control-group-title__text">
            <SimpleIntlMessage id={title} />
          </div>
          {withQuestion && (
            <div
              className={cn('game-edit__control-group-question', {
                'game-edit__control-group-question_active': showHelp,
              })}
              onClick={onQuestionClick}
              role="button"
              tabIndex={0}
            >
              <SVGInline svg={helpIcon} width="18px" height="18px" />
            </div>
          )}
        </div>
      )}
      {beforeContent}
      <div className="game-edit__control-group-content">
        {typeof children === 'function' && children({ showHelp })}
        {typeof children !== 'function' && children}
      </div>
    </div>
  );
};

ControlGroupComponent.propTypes = componentPropertyTypes;
ControlGroupComponent.defaultProps = defaultProps;

const ControlGroup = hoc(ControlGroupComponent);

export default ControlGroup;
