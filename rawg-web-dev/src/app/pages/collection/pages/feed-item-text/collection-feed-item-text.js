import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { push } from 'react-router-redux';
import { FormattedMessage } from 'react-intl';
import { denormalize } from 'normalizr';
import { hot } from 'react-hot-loader/root';
import SVGInline from 'react-svg-inline';

import prepare from 'tools/hocs/prepare';
import Schemas from 'redux-logic/schemas';

import facebookIcon from 'assets/icons/social/facebook.svg';
import twitterIcon from 'assets/icons/social/twitter.svg';

import Page from 'app/ui/page';
import Content from 'app/ui/content';
import CloseButton from 'app/ui/close-button';
import Button from 'app/ui/button/button';
import Error from 'app/ui/error/error';
import { checkSocialRights } from 'app/pages/app/app.actions';
import SocialAccountsButton from 'app/components/social-accounts/social-accounts-button';
import Editor from 'app/components/editor';
import paths from 'config/paths';
import {
  editCollectionFeedItem,
  getCollectionFeedItemPage,
  loadCollection,
  loadCollectionFeed,
} from '../../collection.actions';

import '../collection/collection.styl';
import './collection-feed-item-text.styl';

@hot
@prepare(
  async ({ store, params = {} }) => {
    const { id, itemId } = params;

    const [, page] = await Promise.all([
      store.dispatch(loadCollection(id)),
      store.dispatch(getCollectionFeedItemPage(id, itemId)),
    ]);

    await store.dispatch(loadCollectionFeed(id, page.page));
  },
  {
    updateParam: 'itemId',
  },
)
@connect((state) => ({
  collection: state.collection,
  collectionFeed: denormalize(state.collection.feed.results, Schemas.COLLECTION_FEED_ARRAY, state.entities),
}))
export default class CollectionFeedItemText extends Component {
  static propTypes = {
    collection: PropTypes.shape().isRequired,
    collectionFeed: PropTypes.arrayOf(PropTypes.shape({})),
    params: PropTypes.shape().isRequired,
    dispatch: PropTypes.func.isRequired,
  };

  static defaultProps = {
    collectionFeed: [],
  };

  constructor(...arguments_) {
    super(...arguments_);

    this.providerClick = null;
    this.state = {
      item: null,
      text: '',
      errors: {},
      facebook: false,
      twitter: false,
      rights: {
        facebook: false,
        twitter: false,
      },
    };
  }

  componentDidMount() {
    this.checkRights(false, true);
    window.addEventListener('message', this.handleMessage, false);
  }

  static getDerivedStateFromProps(props, state) {
    if (!state.item && props.collection.id && props.collection.feed.results.length > 0) {
      const { params } = props;
      const { itemId } = params;

      const item = props.collectionFeed.find((itm) => itm.id === parseInt(itemId, 10));

      return {
        text: item.text,
        item,
      };
    }

    return null;
  }

  componentWillUnmount() {
    window.removeEventListener('message', this.handleMessage, false);
  }

  handleSubmit = (e) => {
    e.preventDefault();

    const {
      dispatch,
      collection: { slug },
      params,
    } = this.props;
    const { itemId } = params;

    this.setState({ loading: true });

    dispatch(editCollectionFeedItem(slug, this.state.item, this.state.text))
      .then(() => {
        dispatch(push(`${paths.collection(slug)}#${itemId}`));
      })
      .catch((error) => {
        this.setState({
          loading: false,
          errors: error,
        });
      });
  };

  handlePublishClick = (provider) => {
    this.setState((state) => ({
      [provider]: !state[provider],
    }));
  };

  handleTextarea = (text) => {
    this.setState({ text });
  };

  checkRights = (click, event) => {
    const { dispatch } = this.props;

    if (event !== true && event instanceof Object && event.data.type !== 'UTH_PROVIDER_MESSAGE') {
      return;
    }

    dispatch(checkSocialRights()).then((res) => {
      this.setState((state) => ({
        facebook: click && this.providerClick === 'facebook' ? res.facebook : state.facebook,
        twitter: click && this.providerClick === 'twitter' ? res.twitter : state.twitter,
        rights: res,
      }));
    });
  };

  handleMessage = (event) => {
    this.checkRights(true, event);
  };

  renderForm() {
    if (!this.state.item) return null;

    const { item, text, facebook, twitter, loading, rights, errors } = this.state;
    const { game } = item;

    return (
      <form onSubmit={this.handleSubmit}>
        <div className="collection-feed-item-text-form__form">
          <div className="collection-feed-item-text-form__title">
            <FormattedMessage
              id="collection.feed_item_text_form_title"
              values={{
                title: <span className="collection-feed-item-text-form__title-game">{game.name}</span>,
              }}
            />
          </div>

          <div className="collection-feed-item-text-form__field-textarea">
            <Editor text={text} onChange={this.handleTextarea} />
            {errors.text && errors.text.length > 0 && <Error kind="filed" error={errors.text[0]} />}
          </div>
        </div>

        <div className="collection-feed-item-text-form__controls">
          <div className="collection-feed-item-text-form__publishing">
            {rights.facebook ? (
              <div
                className={`collection-feed-item-text-form__publish-button ${
                  facebook ? 'collection-feed-item-text-form__publish-button_active' : ''
                }`}
                onClick={() => this.handlePublishClick('facebook')}
                role="button"
                tabIndex={0}
              >
                <div className="collection-feed-item-text-form__publish-icon collection-feed-item-text-form__publish-icon_facebook">
                  <SVGInline svg={facebookIcon} width="7px" height="14px" />
                </div>
                <span>
                  <FormattedMessage className="collection-feed-item-text-form__publish-text" id="post.form_facebook" />
                </span>
              </div>
            ) : (
              <SocialAccountsButton provider="facebook">
                <div
                  onClick={() => {
                    this.providerClick = 'facebook';
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className="collection-feed-item-text-form__publish-button">
                    <div className="collection-feed-item-text-form__publish-icon collection-feed-item-text-form__publish-icon_facebook">
                      <SVGInline svg={facebookIcon} width="7px" height="14px" />
                    </div>
                    <span>
                      <FormattedMessage
                        className="collection-feed-item-text-form__publish-text"
                        id="post.form_facebook"
                      />
                    </span>
                  </div>
                </div>
              </SocialAccountsButton>
            )}

            {rights.twitter ? (
              <div
                className={`collection-feed-item-text-form__publish-button ${
                  twitter ? 'collection-feed-item-text-form__publish-button_active' : ''
                }`}
                onClick={() => this.handlePublishClick('twitter')}
                role="button"
                tabIndex={0}
              >
                <div className="collection-feed-item-text-form__publish-icon collection-feed-item-text-form__publish-icon_twitter">
                  <SVGInline svg={twitterIcon} width="15px" height="12px" />
                </div>
                <span>
                  <FormattedMessage id="post.form_twitter" />
                </span>
              </div>
            ) : (
              <SocialAccountsButton provider="twitter">
                <div
                  onClick={() => {
                    this.providerClick = 'twitter';
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className="collection-feed-item-text-form__publish-button">
                    <div className="collection-feed-item-text-form__publish-icon collection-feed-item-text-form__publish-icon_twitter">
                      <SVGInline svg={twitterIcon} width="15px" height="12px" />
                    </div>
                    <span>
                      <FormattedMessage id="post.form_twitter" />
                    </span>
                  </div>
                </div>
              </SocialAccountsButton>
            )}
          </div>

          <div className="collection-feed-item-text-form__button">
            <Button kind="fill" size="medium" disabled={loading} loading={loading}>
              <FormattedMessage id="post.form_button" />
            </Button>
          </div>
        </div>
      </form>
    );
  }

  render() {
    return (
      <Page
        className="collection-feed-item-text page_secondary"
        helmet={{ noindex: true }}
        art={false}
        header={{ display: false }}
      >
        <Content columns="1">
          <CloseButton className="collection__close-button" />
          {this.renderForm()}
        </Content>
      </Page>
    );
  }
}
