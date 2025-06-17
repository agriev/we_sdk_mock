/* eslint-disable camelcase */

import React, { Component } from 'react';
// import PropTypes from 'prop-types';
import { hot } from 'react-hot-loader/root';
import { FormattedMessage } from 'react-intl';
import { Link } from 'app/components/link';

import './settings-export.styl';

import checkAuth from 'tools/hocs/check-auth';
import paths from 'config/paths';
import Button from 'app/ui/button';

@hot
@checkAuth({ login: true })
export default class SettingsExport extends Component {
  static propTypes = {};

  render() {
    return (
      <div className="settings-export">
        <Link target="_blank" to={paths.downloadUserData}>
          <Button type="submit" kind="fill" size="medium" className="settings-export__download-button">
            <FormattedMessage id="settings.download-data" />
          </Button>
        </Link>
      </div>
    );
  }
}
