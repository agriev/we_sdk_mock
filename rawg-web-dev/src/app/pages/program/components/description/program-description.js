import React from 'react';
// import PropTypes from 'prop-types';
import { hot } from 'react-hot-loader/root';
import { compose } from 'recompose';
import HTML from 'html-parse-stringify';

import './program-description.styl';

import SimpleIntlMessage from 'app/components/simple-intl-message/simple-intl-message';
import { programDescriptionType } from 'app/pages/program/program.types';

import Heading from 'app/ui/heading';
import AstTree from 'app/components/ast-tree/ast-tree';

const hoc = compose(hot);

const propTypes = {
  description: programDescriptionType.isRequired,
};

const defaultProps = {
  //
};

const ProgramDescriptionComponent = ({ description }) => (
  <div className="program__description">
    <Heading className="program__description__heading" rank={3}>
      <SimpleIntlMessage id="program.files_description" />:
    </Heading>
    <div className="program__description__text">
      <AstTree ast={HTML.parse(description)} />
    </div>
  </div>
);

ProgramDescriptionComponent.propTypes = propTypes;
ProgramDescriptionComponent.defaultProps = defaultProps;

const ProgramDescription = hoc(ProgramDescriptionComponent);

export default ProgramDescription;
