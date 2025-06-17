import PropTypes from 'prop-types';

export const programNameType = PropTypes.string;
export const programDescriptionType = PropTypes.string;
export const programAttrsType = PropTypes.arrayOf(
  PropTypes.shape({
    title: PropTypes.string,
    value: PropTypes.string,
  }),
);

export const programFilesType = PropTypes.arrayOf(
  PropTypes.shape({
    version: PropTypes.string,
    size: PropTypes.number,
    date: PropTypes.string,
    url: PropTypes.string,
  }),
);

const programType = PropTypes.shape({
  name: programNameType,
  attrs: programAttrsType,
  files: programFilesType,
  description: programDescriptionType,
});

export default programType;
