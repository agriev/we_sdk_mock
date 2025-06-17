/* eslint-disable camelcase */

import range from 'lodash/range';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'app/components/link';
import classnames from 'classnames';
import { FormattedMessage } from 'react-intl';

import paths from 'config/paths';

export default class AmpCollectionCard extends Component {
  static propTypes = {
    collection: PropTypes.shape().isRequired,
    className: PropTypes.string,
    kind: PropTypes.oneOf(['block', 'inline']),
  };

  static defaultProps = {
    className: '',
    kind: undefined,
  };

  get className() {
    const { className, kind } = this.props;

    return classnames('collection-card', {
      [`collection-card_${kind}`]: kind,
      [className]: className,
    });
  }

  render() {
    const { collection = {} } = this.props;
    const { slug, name, games_count, backgrounds } = collection;
    let { games } = collection;

    games =
      games ||
      (Array.isArray(backgrounds)
        ? backgrounds.map((background, index) => ({
            ...background,
            background_image: background.url,
            title: '',
            id: `${background.url}${index}`,
          }))
        : []);

    return (
      <div className={this.className}>
        <div className="collection-card__games">
          {games.map((game, index) => (
            <div className="collection-card__game" key={game.id}>
              <amp-img src={game.background_image.replace('/medua/', '/media/resize/200/-/')} layout="fill" />
              {index === 3 && games_count > 3 && (
                <div className="collection-card__plus-count">{`+${games_count - 3}`}</div>
              )}
            </div>
          ))}
          {range(Math.max(0, 4 - games.length)).map((index) => (
            <div className="collection-card__game" key={index} />
          ))}
        </div>
        <div className="collection-card__meta">
          <Link to={paths.collection(slug)} href={paths.collection(slug)}>
            <div className="collection-card__title">{name}</div>
          </Link>
          <div className="collection-card__count">
            <FormattedMessage id="shared.collection_card_count" values={{ gamesCount: games_count || '0' }} />
          </div>
        </div>
      </div>
    );
  }
}
