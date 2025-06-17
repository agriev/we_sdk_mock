/* eslint-disable react/no-unused-state */

import React, { Component } from 'react';
import { connect } from 'react-redux';
import { Link } from 'app/components/link';
import { FormattedHTMLMessage } from 'react-intl';

import { hot } from 'react-hot-loader/root';

import prepare from 'tools/hocs/prepare';
import SimpleIntlMessage from 'app/components/simple-intl-message/simple-intl-message';
import Heading from 'app/ui/heading';

import appHelper from 'app/pages/app/app.helper';
import Page from 'app/ui/page';
import Content from 'app/ui/content';
import Button from 'app/ui/button';
import './welcome.styl';
import { appSizeType } from 'app/pages/app/app.types';
import paths from 'config/paths';

import Slider from 'app/ui/slider';

@hot
@prepare()
@connect((state) => ({
  size: state.app.size,
  currentUser: state.currentUser,
}))
export default class Welcome extends Component {
  static propTypes = {
    size: appSizeType.isRequired,
  };

  constructor(...data) {
    super(...data);

    this.collectionsSliderRef = React.createRef();
    this.gamesSliderRef = React.createRef();
  }

  handleCollectionsSliderClick = () => {
    this.collectionsSliderRef.current.slickNext();
  };

  handleGamesSliderClick = () => {
    this.gamesSliderRef.current.slickNext();
  };

  renderHeader = () => (
    <div className="welcome__block welcome__block_header">
      <Heading className="welcome__title-h1" rank={1}>
        <FormattedHTMLMessage id="welcome.title" />
      </Heading>
      <div className="welcome__title-description">
        <FormattedHTMLMessage id="welcome.title_description" />
      </div>
    </div>
  );

  renderUser = () => (
    <div className="welcome__block welcome__block_user">
      <Heading className="welcome__title-h2" rank={2}>
        <FormattedHTMLMessage id="welcome.title_user" />
      </Heading>
      <div className="welcome__description">
        <FormattedHTMLMessage id="welcome.title_user_description" />
      </div>
      <div className="welcome__image welcome__image_user" />
    </div>
  );

  renderProfile = () => (
    <div className="welcome__block welcome__block_profile">
      <Heading className="welcome__title-h2" rank={2}>
        <FormattedHTMLMessage id="welcome.title_profile" />
      </Heading>
      <div className="welcome__description">
        <FormattedHTMLMessage id="welcome.title_profile_description" />
      </div>
      <div className="welcome__image welcome__image_profile" />
    </div>
  );

  renderWelcomeDots = (name, activeIndex) =>
    [0, 1, 2].map((index) => (
      <div
        className={`welcome__slider-dot ${index === activeIndex ? 'welcome__slider-dot_active' : ''}`}
        onClick={() => this.handleSliderDotClick(name, index)}
        role="button"
        tabIndex={0}
        key={index}
      />
    ));

  renderCollections = () => (
    <div className="welcome__block welcome__block_collections">
      <Heading className="welcome__title-h2" rank={2}>
        <FormattedHTMLMessage id="welcome.title_collections" />
      </Heading>
      <div className="welcome__description">
        <FormattedHTMLMessage id="welcome.title_collections_description" />
      </div>
      <div className="welcome__slider">
        <Slider
          className="welcome__slides welcome__slides_collections"
          ref={this.collectionsSliderRef}
          arrows={false}
          dots
        >
          {[1, 2, 3].map((number) => (
            <div
              className={`welcome__image welcome__image_collection welcome__image_collection-${number}`}
              key={number}
            />
          ))}
        </Slider>
        <div
          className="welcome__slider-overlay"
          onClick={this.handleCollectionsSliderClick}
          role="button"
          tabIndex={0}
        />
      </div>
    </div>
  );

  renderGames = () => (
    <div className="welcome__block welcome__block_collections">
      <Heading className="welcome__title-h2" rank={2}>
        <FormattedHTMLMessage id="welcome.title_games" />
      </Heading>
      <div className="welcome__description">
        <FormattedHTMLMessage id="welcome.title_games_description" />
      </div>
      <div className="welcome__slider">
        <Slider className="welcome__slides welcome__slides_games" ref={this.gamesSliderRef} arrows={false} dots>
          {[1, 2, 3].map((number) => (
            <div className={`welcome__image welcome__image_game welcome__image_game-${number}`} key={number} />
          ))}
        </Slider>
        <div className="welcome__slider-overlay" onClick={this.handleGamesSliderClick} role="button" tabIndex={0} />
      </div>
    </div>
  );

  renderSignup = () => (
    <div className="welcome__block welcome__block_signup">
      <div className="welcome__description welcome__description_signup">
        <Link className="welcome__button-link" to={paths.register} href={paths.register}>
          <Button kind="fill" size="medium">
            <SimpleIntlMessage id="welcome.signup" />
          </Button>
        </Link>
        <Link className="welcome__link" to={paths.login} href={paths.login} rel="nofollow">
          <SimpleIntlMessage id="welcome.login" />
        </Link>
      </div>
    </div>
  );

  render() {
    const { size } = this.props;

    return (
      <Page
        className="welcome"
        art={{
          height: appHelper.isDesktopSize({ size }) ? '900px' : '620px',
          bottom: true,
          bottomHeight: appHelper.isDesktopSize({ size }) ? '700px' : '500px',
        }}
        helmet={{
          none: true,
        }}
        loader={false}
      >
        <Content className="welcome__content" columns="1">
          {this.renderHeader()}
          {this.renderUser()}
          {this.renderProfile()}
          {this.renderCollections()}
          {this.renderGames()}
          {this.renderSignup()}
        </Content>
      </Page>
    );
  }
}
