/* eslint-disable react/no-array-index-key */
import React from 'react';
import PropTypes from 'prop-types';
import { hot } from 'react-hot-loader';
import { compose } from 'recompose';
import cn from 'classnames';
import SVGInline from 'react-svg-inline';

import Error from 'app/ui/error';
import FieldStatus from 'app/pages/game-edit/components/field-status/field-status';

import importantIcon from 'assets/icons/important.svg';

import './fields-group.styl';

const hoc = compose(hot(module));

const componentPropertyTypes = {
  children: PropTypes.node.isRequired,
  deletedMessageId: PropTypes.string,
  errors: PropTypes.arrayOf(PropTypes.string),
  deleted: PropTypes.arrayOf(PropTypes.node),
  group: PropTypes.string,
  fewFields: PropTypes.bool,
  showHelp: PropTypes.bool,
  showHelpOnTop: PropTypes.bool,
  helpText: PropTypes.node,
};

const defaultProps = {
  deletedMessageId: '',
  errors: [],
  deleted: [],
  group: '',
  fewFields: false,
  showHelp: false,
  showHelpOnTop: false,
  helpText: undefined,
};

const messagesEnabled = false;

const FieldsGroupComponent = ({
  children,
  errors,
  deleted,
  group,
  deletedMessageId,
  fewFields,
  showHelp,
  showHelpOnTop,
  helpText,
}) => (
  <div className="game-edit__fields-group">
    {showHelpOnTop && showHelp && (
      <div className="game-edit__fields-group-tip">
        <SVGInline svg={importantIcon} />
        {helpText}
      </div>
    )}
    <div
      className={cn('game-edit__fields-group-content', {
        'game-edit__fields-group-content_few-fields': fewFields,
      })}
    >
      {children}
    </div>
    {errors &&
      errors.map((error, index) => (
        <Error className="game-edit__fields-group-error" error={error} isIcon key={`${index}${error.slice(0, 5)}`} />
      ))}
    {showHelpOnTop === false && showHelp && (
      <div className="game-edit__fields-group-tip">
        <SVGInline svg={importantIcon} />
        {helpText}
      </div>
    )}
    {messagesEnabled && deleted && deleted.length > 0 && (
      <FieldStatus message={{ messageID: deletedMessageId, values: { group } }} />
    )}
  </div>
);

FieldsGroupComponent.propTypes = componentPropertyTypes;
FieldsGroupComponent.defaultProps = defaultProps;

const FieldsGroup = hoc(FieldsGroupComponent);

export default FieldsGroup;
