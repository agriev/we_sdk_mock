import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'app/components/link';

import paths from 'config/paths';
import appHelper from 'app/pages/app/app.helper';
import { appSizeType } from 'app/pages/app/app.types';

import Avatar from 'app/ui/avatar';

import './person-card.styl';

const componentPropertyTypes = {
  className: PropTypes.string,
  person: PropTypes.shape().isRequired,
  size: appSizeType.isRequired,
};

const defaultProps = {
  className: '',
};

const PersonCard = ({ className, person, size }) => {
  const { name, positions } = person;

  return (
    <Link to={paths.creator(person.slug)} className="person-card__link">
      <div className={['person-card', className].join(' ')}>
        <Avatar
          size={appHelper.isPhoneSize({ size }) ? 48 : 56}
          // src={person.image && resize(200, person.image)}
          src={person.image}
          profile={{ id: person.id }}
        />
        <div className="person-card__meta">
          <h5 className="person-card__name">{name}</h5>
          <p className="person-card__positions">
            {Array.isArray(positions) &&
              positions.map((position) => position.name[0].toUpperCase() + position.name.slice(1)).join(', ')}
          </p>
        </div>
      </div>
    </Link>
  );
};

PersonCard.propTypes = componentPropertyTypes;
PersonCard.defaultProps = defaultProps;

export default PersonCard;
