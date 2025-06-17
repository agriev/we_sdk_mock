import React from 'react';
// import PropTypes from 'prop-types';
import { hot } from 'react-hot-loader/root';

import './program-information.styl';

import Heading from 'app/ui/heading/heading';
import SimpleIntlMessage from 'app/components/simple-intl-message/simple-intl-message';
import { programAttrsType } from 'app/pages/program/program.types';
import { compose } from 'recompose';

const hoc = compose(hot);

const propTypes = {
  attrs: programAttrsType.isRequired,
};

const defaultProps = {
  //
};

const ProgramInformationComponent = ({ attrs }) => (
  <div className="program__information">
    <Heading className="program__information__heading" rank={3}>
      <SimpleIntlMessage id="program.info_title" />
    </Heading>
    <div className="program__information__items">
      {attrs.map(({ name, value }) => (
        <div key={name} className="program__information__item">
          <div className="program__information__item__name">{name}:</div>
          <div className="program__information__item__value">{value}</div>
        </div>
      ))}
    </div>
  </div>
);

ProgramInformationComponent.propTypes = propTypes;
ProgramInformationComponent.defaultProps = defaultProps;

const ProgramInformation = hoc(ProgramInformationComponent);

export default ProgramInformation;
