import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import { appSizeType } from 'app/pages/app/app.types';
import PersonsSlider from 'app/components/persons-slider';

import ProfileTitle from '../profile-title';

import './common-developers.styl';

const connector = connect((state) => ({
  topPersons: state.profile.topPersons.results,
  size: state.app.size,
}));

const componentPropertyTypes = {
  topPersons: PropTypes.arrayOf(PropTypes.shape()).isRequired,
  size: appSizeType.isRequired,
  className: PropTypes.string,
};

const componentDefaultProperties = {
  className: '',
};

const CommonDevelopers = ({ className, topPersons, size }) => {
  if (topPersons.length > 0) {
    return (
      <div className={['profile-common-developers', className].join(' ')}>
        <ProfileTitle id="profile.overview_top_persons_title" type="large" centred />
        <PersonsSlider persons={topPersons} size={size} />
      </div>
    );
  }

  return null;
};

CommonDevelopers.propTypes = componentPropertyTypes;
CommonDevelopers.defaultProps = componentDefaultProperties;

export default connector(CommonDevelopers);
