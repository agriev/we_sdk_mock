/* eslint-disable camelcase */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { injectIntl } from 'react-intl';
import { hot } from 'react-hot-loader';

import compact from 'lodash/compact';

import './container.styl';

import whenData from 'tools/logic/when-data';

import denormalizeGame from 'tools/redux/denormalize-game';
import paths from 'config/paths';
import appHelper from 'app/pages/app/app.helper';
import Page from 'app/ui/page';
import Content from 'app/ui/content';
import SubpageHeading from 'app/ui/subpage-heading';
import SubpageMenu from 'app/ui/subpage-menu';
import Heading from 'app/ui/heading';
import SimpleIntlMessage from 'app/components/simple-intl-message';

import gameType from 'app/pages/game/game.types';
import { isUgly } from 'app/pages/game/game.helper';

import { appSizeType, appLocaleType } from 'app/pages/app/app.types';
import intlShape from 'tools/prop-types/intl-shape';

@hot(module)
@connect((state) => ({
  size: state.app.size,
  locale: state.app.locale,
  game: denormalizeGame(state),
}))
@injectIntl
export default class GameEditContainer extends Component {
  static propTypes = {
    title: PropTypes.string,
    logo: PropTypes.element,
    game: gameType.isRequired,
    children: PropTypes.node,
    size: appSizeType.isRequired,
    locale: appLocaleType.isRequired,
    intl: intlShape.isRequired,
    id: PropTypes.string,
    dispatch: PropTypes.func.isRequired,
  };

  static defaultProps = {
    title: '',
    logo: undefined,
    children: undefined,
    id: undefined,
  };

  getPageProps = () => {
    const { intl, game = {}, title, id } = this.props;

    const { name, description, image, background_image, dominant_color } = game;

    return {
      helmet: {
        title: id ? `${name} - Edit - ${intl.formatMessage({ id: title })}` : 'Add a missing game',
        description,
        image: background_image,
      },
      className: 'game',
      art: {
        image: {
          path: image || background_image,
          color: `#${dominant_color}`,
        },
        height: '250px',
        colored: true,
        ugly: isUgly(game),
      },
    };
  };

  renderHead() {
    const { game, title, logo, id } = this.props;
    const { slug, name } = game;
    const titleDom = whenData(title, () => (
      <div>
        <Heading className="subpage-heading__title" rank={1}>
          <SimpleIntlMessage id={title} />
          {logo}
        </Heading>
        <p>{name}</p>
      </div>
    ));

    return <SubpageHeading path={{ pathname: paths.game(slug), state: game }} title={titleDom} hideArrow={!id} />;
  }

  renderLinks() {
    const { game, id, locale } = this.props;
    const { slug } = game;

    const afterGameCreationMessage = id ? undefined : 'Will be available after game creation';

    const titles = [
      {
        name: 'game_edit.basic',
        path: id ? paths.gameEditBasic(slug) : paths.gameCreateBasic,
      },
      {
        name: 'game_edit.screenshots',
        path: paths.gameEditScreenshots(slug),
        disabled: !id,
        title: afterGameCreationMessage,
      },
      {
        name: 'game_edit.stores',
        path: paths.gameEditStores(slug),
        disabled: !id,
        title: afterGameCreationMessage,
      },
      {
        name: 'game_edit.tags',
        path: paths.gameEditTags(slug),
        disabled: !id,
        title: afterGameCreationMessage,
      },
      {
        name: 'game_edit.creators',
        path: paths.gameEditCreators(slug),
        disabled: !id,
        title: afterGameCreationMessage,
      },
      {
        name: 'game_edit.linked-games',
        path: paths.gameEditLinkedGames(slug),
        disabled: !id,
        title: afterGameCreationMessage,
      },
    ];

    return <SubpageMenu locale={locale} titles={compact(titles)} />;
  }

  renderDesktopPage() {
    const { game, children } = this.props;
    const { id } = game;

    return (
      <Page {...this.getPageProps()} key={id}>
        <Content columns="1">
          <div>{this.renderHead()}</div>
        </Content>
        <Content columns="2-1">
          <div>{children}</div>
          <div>{this.renderLinks()}</div>
        </Content>
      </Page>
    );
  }

  renderPhonePage() {
    const { game, children } = this.props;
    const { id } = game;

    return (
      <Page {...this.getPageProps()} key={id}>
        <Content columns="1">
          <div>
            {this.renderHead()}
            {this.renderLinks()}
            {children}
          </div>
        </Content>
      </Page>
    );
  }

  render() {
    const { size } = this.props;

    return appHelper.isDesktopSize({ size }) ? this.renderDesktopPage() : this.renderPhonePage();
  }
}
