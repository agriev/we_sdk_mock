import React, { Component } from 'react';
import { Link } from 'app/components/link';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { FormattedMessage } from 'react-intl';

import paths from 'config/paths';

const componentPropertyTypes = {
  className: PropTypes.string,
};

const defaultProps = {
  className: '',
};

@connect((state) => ({
  app: state.app,
}))
class AmpHeaderMenu extends Component {
  static propTypes = componentPropertyTypes;

  constructor(props) {
    super(props);

    this.state = {};
  }

  render() {
    const { className } = this.props;
    return (
      <div className={['amp-header-menu', className].join(' ')}>
        <Link to={paths.login} href={paths.login} rel="nofollow">
          <FormattedMessage id="login.button" />
        </Link>
      </div>
    );
  }
}

AmpHeaderMenu.defaultProps = defaultProps;

export default AmpHeaderMenu;
