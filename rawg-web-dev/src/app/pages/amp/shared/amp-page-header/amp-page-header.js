import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { Link } from 'app/components/link';
import { compose } from 'recompose';

import Logo from 'app/ui/logo';
import paths from 'config/paths';

import AmpHeaderMenu from './components/amp-header-menu';

const componentPropertyTypes = {
  className: PropTypes.string,
};

const defaultProps = {
  className: '',
};

const hoc = compose(connect());

const AmpPageHeaderComponent = (props) => {
  const { className } = props;
  return (
    <div className={['amp-page-header', className].join(' ')}>
      <Link to={paths.search()} href={paths.search()} className="no-border-link">
        <div className="amp-page-header__search" />
      </Link>
      <Link to={paths.index} className="no-border-link">
        <Logo />
      </Link>
      <AmpHeaderMenu />
    </div>
  );
};

AmpPageHeaderComponent.propTypes = componentPropertyTypes;
AmpPageHeaderComponent.defaultProps = defaultProps;

const AmpPageHeader = hoc(AmpPageHeaderComponent);

export default AmpPageHeader;
