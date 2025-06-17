import React from 'react';
import { Link } from 'app/components/link';
import SVGInline from 'react-svg-inline';
import PropTypes from 'prop-types';

import formatNumber from 'tools/format-number';

import Heading from 'app/ui/heading';

import ArrowIcon from 'assets/icons/arrow.svg';

import './catalog-heading.styl';

const propTypes = {
  heading: PropTypes.string.isRequired,
  path: PropTypes.string.isRequired,
  count: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
};

const CatalogHeading = ({ heading, path, count }) => {
  return (
    <div className="catalog-heading">
      <Link className="catalog-heading__link" to={path} href={path}>
        <Heading rank={2} looksLike={4}>
          {heading}
        </Heading>
        <span className="catalog-heading__count-wrapper">
          <span className="catalog-heading__count">{formatNumber(count)}</span>
          <SVGInline className="catalog-heading__icon" svg={ArrowIcon} width="9px" height="16px" />
        </span>
      </Link>
    </div>
  );
};

CatalogHeading.propTypes = propTypes;

export default CatalogHeading;
