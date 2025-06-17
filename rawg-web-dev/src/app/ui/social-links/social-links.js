import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { FormattedMessage } from 'react-intl';

import toPairs from 'lodash/toPairs';

import cond from 'ramda/src/cond';
import equals from 'ramda/src/equals';
import always from 'ramda/src/always';

import appHelper from 'app/pages/app/app.helper';

import './social-links.styl';
import { appLocaleType } from 'app/pages/app/app.types';

const messageId = cond([
  [equals('discord'), always('shared.social_discord')],
  [equals('twitter'), always('shared.social_twitter')],
  [equals('facebook'), always('shared.social_facebook')],
]);

export default class SocialLinks extends React.Component {
  static propTypes = {
    locale: appLocaleType.isRequired,
    className: PropTypes.string,
  };

  static defaultProps = {
    className: '',
  };

  getClassName() {
    const { className } = this.props;

    return classnames('social-links', {
      [className]: className,
    });
  }

  render() {
    const { locale } = this.props;

    return (
      <div className={this.getClassName()}>
        {toPairs(appHelper.SOCIAL[locale]).map(([key, url]) => (
          <a key={key} href={url} target="_blank" className="social-links__link" rel="nofollow noopener noreferrer">
            <div className={`social-links__icon social-links__icon_${key}`} />
            <FormattedMessage id={messageId(key)} />
          </a>
        ))}
      </div>
    );
  }
}
