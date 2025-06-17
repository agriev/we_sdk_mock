import mapValues from 'lodash/mapValues';

const { SubmissionError } = require('redux-form');

const throwValidationError = (error) => {
  if (error.errors) {
    throw new SubmissionError({
      ...mapValues(error.errors, (value) => value[0]),
      _error: error.errors.non_field_errors,
    });
  }

  throw error;
};

export default throwValidationError;
