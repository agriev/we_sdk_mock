/* eslint-disable jsx-a11y/no-noninteractive-element-to-interactive-role */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { hot } from 'react-hot-loader';

import trans from 'tools/trans';

import Container from 'app/pages/game-edit/components/container';
import ControlGroup from 'app/pages/game-edit/components/control-group';
import FieldsGroup from 'app/pages/game-edit/components/fields-group';
import Field from 'app/pages/game-edit/components/field';
import Screenshots from 'app/pages/game-edit/components/screenshots';

import { sendAnalyticsEdit } from 'scripts/analytics-helper';
import { fieldTitles } from 'app/pages/game-edit/game-edit.helper';

@hot(module)
export default class GameEditScreenshots extends Component {
  static propTypes = {
    params: PropTypes.shape().isRequired,
  };

  componentDidMount() {
    sendAnalyticsEdit('click_on_subpage');
  }

  render() {
    const { id } = this.props.params;

    return (
      <Container title={fieldTitles.screenshots} id={id}>
        <ControlGroup title="game_edit.group_screenshots" withQuestion>
          {({ showHelp }) => (
            <FieldsGroup showHelpOnTop showHelp={showHelp} helpText={trans('game_edit.field_screenshots_help')}>
              <Field>
                <Screenshots gameId={id} />
              </Field>
            </FieldsGroup>
          )}
        </ControlGroup>
      </Container>
    );
  }
}
