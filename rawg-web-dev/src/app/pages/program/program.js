import React from 'react';
import { compose } from 'recompose';
import { connect } from 'react-redux';
import { injectIntl } from 'react-intl';
import { hot } from 'react-hot-loader/root';

import './program.styl';

import get from 'lodash/get';

import checkLocale from 'tools/hocs/check-locale';
import prepare from 'tools/hocs/prepare';

import Page from 'app/ui/page';

import programType from 'app/pages/program/program.types';
import Heading from 'app/ui/heading';
import ProgramInformation from 'app/pages/program/components/information/program-information';
import ProgramFiles from 'app/pages/program/components/files/program-files';
import ProgramDescription from 'app/pages/program/components/description/program-description';

import { loadSoftware } from 'app/pages/program/program.actions';

const hoc = compose(
  hot,
  prepare(async ({ store, params }) => {
    const { id } = params;

    await store.dispatch(loadSoftware({ id }));
  }),
  checkLocale('ru'),
  connect((state, props) => ({
    program: get(state, `programs[${props.params.id}]`),
  })),
  injectIntl,
);

const propTypes = {
  program: programType,
};

const defaultProps = {
  program: undefined,
};

const ProgramComponent = ({ program }) => {
  if (!program || !program.name) {
    return null;
  }

  return (
    <Page
      helmet={{
        title: program.seo_title,
        description: program.seo_description,
        keywords: program.seo_keywords,
      }}
      className="program-page"
    >
      <Heading className="program__heading" rank={1}>
        {program.seo_h1}
      </Heading>
      <ProgramInformation attrs={program.attrs} />
      <ProgramFiles files={program.files} />
      <ProgramDescription description={program.description} />
    </Page>
  );
};

ProgramComponent.propTypes = propTypes;
ProgramComponent.defaultProps = defaultProps;

const Program = hoc(ProgramComponent);

export default Program;
