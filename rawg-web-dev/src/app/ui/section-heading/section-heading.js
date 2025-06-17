import React from 'react';
import { Link } from 'app/components/link';
import PropTypes from 'prop-types';
import cn from 'classnames';

import Heading from 'app/ui/heading';

import RenderMounted from 'app/render-props/render-mounted';

import './section-heading.styl';

const componentPropertyTypes = {
  heading: PropTypes.node.isRequired,
  image: PropTypes.shape({
    src: PropTypes.string,
    alt: PropTypes.string,
  }),
  url: PropTypes.string,
  count: PropTypes.oneOfType([PropTypes.number, PropTypes.string, PropTypes.element]),
  size: PropTypes.oneOf(['big', 'medium', 'small']),
  type: PropTypes.oneOf(['centered', 'baseline']),
};

const componentDefaultProperties = {
  image: undefined,
  url: '',
  count: undefined,
  size: 'big',
  type: 'centered',
};

const SectionHeading = ({ heading, image, url, count, size, type }) => {
  const headingClass = cn('section-heading', `section-heading_${size}`, {
    [`section-heading_${type}`]: !url,
  });

  return (
    <RenderMounted>
      {({ visible, onChildReference }) => (
        <div className={headingClass} ref={(element) => onChildReference(element)}>
          {url ? (
            <>
              <Link className="section-heading__link" to={url} href={url}>
                <Heading rank={2} className="section-heading__text">
                  <span>{heading}</span>
                </Heading>
                {image && visible && <img className="section-heading__image" src={image.src} alt={image.alt} />}
              </Link>
              {count && (
                <Link className="section-heading__count" to={url} href={url}>
                  {count}
                </Link>
              )}
            </>
          ) : (
            <>
              <span className="section-heading__text">
                <span>{heading}</span>
              </span>
              {image && visible && <img className="section-heading__image" src={image.src} alt={image.alt} />}
              {count && <span className="section-heading__count">{count}</span>}
            </>
          )}
        </div>
      )}
    </RenderMounted>
  );
};

SectionHeading.propTypes = componentPropertyTypes;
SectionHeading.defaultProps = componentDefaultProperties;

export default SectionHeading;
