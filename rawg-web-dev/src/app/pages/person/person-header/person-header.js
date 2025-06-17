import React, { Component } from 'react';
import PropTypes from 'prop-types';

import Heading from 'app/ui/heading';
import Avatar from 'app/ui/avatar';

import './person-header.styl';

const componentPropertyTypes = {
  className: PropTypes.string,
  name: PropTypes.string,
  positions: PropTypes.arrayOf(PropTypes.object),
  image: PropTypes.string,
};

const defaultProps = {
  className: '',
  name: '',
  positions: [],
  image: '',
};

// @injectIntl
class PersonHeader extends Component {
  static propTypes = componentPropertyTypes;

  constructor(props) {
    super(props);

    this.state = {};
  }

  render() {
    const { className, name, positions, image } = this.props;

    return (
      <div className={['person-header', className].join(' ')}>
        <div className="person-header__name-positions">
          <Heading className="person-header__name" rank={1} itemProp="name">
            {name}
          </Heading>
          <div itemProp="jobTitle" className="person-header__positions">
            {Array.isArray(positions) &&
              positions.map((position) => position.name[0].toUpperCase() + position.name.slice(1)).join(', ')}
          </div>
        </div>
        <div className="person-header__image">{image && image !== '' && <Avatar size={86} src={image} />}</div>
        {/* <div className="person-header__follow"></div> */}
      </div>
    );
  }
}

PersonHeader.defaultProps = defaultProps;

export default PersonHeader;
