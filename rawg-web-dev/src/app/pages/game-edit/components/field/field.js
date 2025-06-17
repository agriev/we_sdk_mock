import React from 'react';
import PropTypes from 'prop-types';
import { hot } from 'react-hot-loader';
import { compose } from 'recompose';
import { injectIntl } from 'react-intl';
import SVGInline from 'react-svg-inline';

import lockedIcon from 'assets/icons/locked.svg';
import SimpleIntlMessage from 'app/components/simple-intl-message';

import intlShape from 'tools/prop-types/intl-shape';

import './field.styl';

const hoc = compose(
  hot(module),
  injectIntl,
);

const componentPropertyTypes = {
  children: PropTypes.node.isRequired,
  title: PropTypes.string,
  important: PropTypes.bool,
  required: PropTypes.bool,
  intl: intlShape.isRequired,
};

const defaultProps = {
  important: false,
  required: false,
  title: undefined,
};

const getTitle = ({ important, required, intl }) => {
  if (important) {
    return intl.formatMessage({
      id: 'game_edit.field_important',
    });
  }

  if (required) {
    return intl.formatMessage({
      id: 'game_edit.field_required',
    });
  }

  return undefined;
};

const FieldComponent = ({ children, title, important, required, intl }) => (
  <div className="game-edit__field">
    {title && (
      <div className="game-edit__field-title" title={getTitle({ important, required, intl })}>
        <SimpleIntlMessage id={title} />
        {(important || required) && <span className="game-edit__field__important-flag">*</span>}
        {important && (
          <div className="game-edit__field__important-lock-icon">
            <SVGInline svg={lockedIcon} />
          </div>
        )}
      </div>
    )}
    <div className="game-edit__field-content">{children}</div>
  </div>
);

FieldComponent.propTypes = componentPropertyTypes;
FieldComponent.defaultProps = defaultProps;

const Field = hoc(FieldComponent);

export default Field;
