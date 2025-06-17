import PropTypes from 'prop-types';

export const idType = PropTypes.number;
export const submittingType = PropTypes.bool;
export const submittedType = PropTypes.bool;

export const uploadingImagesType = PropTypes.shape({
  active: PropTypes.bool.isRequired,
  allCount: PropTypes.number.isRequired,
  uploadedCount: PropTypes.number.isRequired,
});

export const titleType = PropTypes.shape({
  current: PropTypes.string,
  changed: PropTypes.string,
});

export const descriptionType = PropTypes.shape({
  current: PropTypes.string,
  changed: PropTypes.string,
});

export const esrbRatingType = PropTypes.shape({
  current: PropTypes.number,
  changed: PropTypes.number,
});

export const releasedType = PropTypes.shape({
  current: PropTypes.string,
  changed: PropTypes.string,
});

export const tbaType = PropTypes.shape({
  current: PropTypes.bool,
  changed: PropTypes.bool,
});

export const alternativeNamesType = PropTypes.shape({
  current: PropTypes.arrayOf(PropTypes.string),
  changed: PropTypes.arrayOf(PropTypes.string),
  deleted: PropTypes.arrayOf(PropTypes.string),
});

export const platformsType = PropTypes.shape({
  current: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number,
      name: PropTypes.string,
      slug: PropTypes.string,
    }),
  ),
  changed: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number,
      name: PropTypes.string,
      slug: PropTypes.string,
    }),
  ),
  deleted: PropTypes.arrayOf(PropTypes.number),
});

export const genresType = PropTypes.shape({
  current: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number,
      name: PropTypes.string,
      slug: PropTypes.string,
    }),
  ),
  changed: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number,
      name: PropTypes.string,
      slug: PropTypes.string,
    }),
  ),
  deleted: PropTypes.arrayOf(PropTypes.number),
});

export const developersType = PropTypes.shape({
  current: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number,
      name: PropTypes.string,
      slug: PropTypes.string,
    }),
  ),
  changed: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number,
      name: PropTypes.string,
      slug: PropTypes.string,
    }),
  ),
  deleted: PropTypes.arrayOf(PropTypes.number),
});

export const publishersType = PropTypes.shape({
  current: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number,
      name: PropTypes.string,
      slug: PropTypes.string,
    }),
  ),
  changed: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number,
      name: PropTypes.string,
      slug: PropTypes.string,
    }),
  ),
  deleted: PropTypes.arrayOf(PropTypes.number),
});

export default PropTypes.shape({
  submitting: submittingType,
  submitted: submittedType,
  uploadingImages: uploadingImagesType,
  id: idType,
  title: titleType,
  alternative_names: alternativeNamesType,
  description: descriptionType,
  esrb_rating: esrbRatingType,
  platforms: platformsType,
  genres: genresType,
  released: releasedType,
  tba: tbaType,
  developers: developersType,
  publishers: publishersType,
});
