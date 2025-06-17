import React from 'react';
import PropTypes from 'prop-types';
import { compose } from 'recompose';
import { hot } from 'react-hot-loader/root';
import { useIntl } from 'react-intl';
import cn from 'classnames';

import id from 'tools/id';

import './metascore-label.styl';

export function getMetascoreColor(rating) {
  if (rating > 74) {
    return 'green';
  }

  if (rating > 50 && rating <= 74) {
    return 'yellow';
  }

  return 'red';
}

const hoc = compose(hot);

const propTypes = {
  rating: PropTypes.number.isRequired,
  withTitle: PropTypes.bool,
};

const defaultProps = {
  withTitle: false,
};

const MetascoreLabelComponent = ({ rating, withTitle }) => {
  const intl = useIntl();
  const color = getMetascoreColor(rating);

  return (
    <div
      title={intl.formatMessage(id('game.metacritic'))}
      className={cn('metascore-label', `metascore-label_${color}`)}
    >
      {withTitle && ''}
      {rating}
    </div>
  );
};

MetascoreLabelComponent.propTypes = propTypes;
MetascoreLabelComponent.defaultProps = defaultProps;

const MetascoreLabel = hoc(MetascoreLabelComponent);

export default MetascoreLabel;
