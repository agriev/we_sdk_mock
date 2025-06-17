import React from 'react';
// import PropTypes from 'prop-types';
import { hot } from 'react-hot-loader/root';
import { compose } from 'recompose';

import './program-files.styl';

import SimpleIntlMessage from 'app/components/simple-intl-message/simple-intl-message';
import { programFilesType } from 'app/pages/program/program.types';

import Heading from 'app/ui/heading';
import FileCard from 'app/ui/file-card';

const hoc = compose(hot);

const propTypes = {
  files: programFilesType.isRequired,
};

const defaultProps = {
  //
};

const ProgramFilesComponent = ({ files }) => (
  <div className="program__files">
    <Heading className="program__files__heading" rank={3}>
      <SimpleIntlMessage id="program.files_title" />
    </Heading>
    <div className="program__files__items">
      {files.map(({ name, attributes, url }) => (
        <FileCard key={name} name={name} url={url} attrs={attributes} />
      ))}
    </div>
  </div>
);

ProgramFilesComponent.propTypes = propTypes;
ProgramFilesComponent.defaultProps = defaultProps;

const ProgramFiles = hoc(ProgramFilesComponent);

export default ProgramFiles;
