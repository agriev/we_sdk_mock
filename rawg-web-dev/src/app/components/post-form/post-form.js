import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import classnames from 'classnames';
import { FormattedMessage, injectIntl } from 'react-intl';
import pick from 'lodash/pick';

import denormalizeGamesArr from 'tools/redux/denormalize-games-arr';
import Button from 'app/ui/button/button';
import Error from 'app/ui/error/error';
import Editor from 'app/components/editor';
import { appSizeType } from 'app/pages/app/app.types';
import { allGames as allGamesType } from 'app/pages/search/search.types';

import intlShape from 'tools/prop-types/intl-shape';

import PostFormGameSelector from './post-form.game-selector';

import { checkSocialRights, cleanPost } from './post-form.actions';
import './post-form.styl';

export const postFormPropTypes = {
  className: PropTypes.string,
  post: PropTypes.shape(),
  errors: PropTypes.shape().isRequired,
  onSubmit: PropTypes.func.isRequired,
  dispatch: PropTypes.func.isRequired,
  selectGame: PropTypes.bool,
  allGames: allGamesType.isRequired,
  size: appSizeType.isRequired,
  intl: intlShape.isRequired,
  clean: PropTypes.bool,
  allRatings: PropTypes.arrayOf(PropTypes.object).isRequired,
};

const defaultProps = {
  className: '',
  selectGame: false,
  post: {
    game: undefined,
    id: null,
    text: '',
    rating: null,
    reactions: [],
  },
  clean: false,
};

@injectIntl
@connect((state) => ({
  allRatings: state.app.ratings,
  reactions: state.app.reactions,
  allGames: {
    ...state.search.allGames,
    results: denormalizeGamesArr(state, 'search.allGames.results'),
  },
  size: state.app.size,
  errors: state.post.errors,
}))
export default class PostForm extends Component {
  static propTypes = postFormPropTypes;

  static defaultProps = defaultProps;

  constructor(props) {
    super(props);

    const { post } = props;
    const { id, title = '', text = '', game } = post;

    this.state = {
      id,
      title,
      text,
      game,
      facebook: false,
      twitter: false,
      rights: {
        facebook: false,
        twitter: false,
      },
    };

    this.providerClick = null;
  }

  componentDidMount() {
    this.checkRights(false, true);
    window.addEventListener('message', this.handleMessage, false);

    if (this.props.clean) {
      this.props.dispatch(cleanPost());
    }
  }

  static getDerivedStateFromProps(props, state) {
    if (props.post.id && !state.id) {
      return {
        id: props.post.id,
        title: props.post.title,
        text: props.post.text,
        game: props.post.game,
      };
    }

    return null;
  }

  componentWillUnmount() {
    window.removeEventListener('message', this.handleMessage, false);
  }

  getClassName() {
    const { className } = this.props;

    return classnames('post-form', {
      [className]: className,
    });
  }

  handleSubmit = (e) => {
    e.preventDefault();

    this.setState({ loading: true });

    const { onSubmit } = this.props;

    const data = {
      ...pick(this.state, ['title', 'text', 'game', 'facebook', 'twitter', 'rights']),
    };

    if (typeof onSubmit === 'function') {
      onSubmit(data).catch((/* err */) => {
        this.setState({ loading: false });
      });
    }
  };

  handlePublishClick = (provider) => {
    this.setState((state) => ({
      [provider]: !state[provider],
    }));
  };

  handleInput = (e) => {
    this.setState({ title: e.target.value.replace(/<\/?[^>]+(>|$)/g, '') });
  };

  handleTextarea = (text) => this.setState({ text });

  handleSelectGame = (game) => this.setState({ game });

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

  render() {
    const { errors, selectGame, allGames, size, dispatch, intl, allRatings } = this.props;
    const { title, text, loading, game } = this.state;

    return (
      <div className={this.getClassName()}>
        <form onSubmit={this.handleSubmit}>
          <div className="post-form__form">
            <div className="post-form__title">
              <FormattedMessage
                id="post.form_title"
                values={{
                  title: <span className="post-form__title-game">{game && game.name}</span>,
                }}
              />
            </div>

            {selectGame && (
              <PostFormGameSelector
                intl={intl}
                allGames={allGames}
                size={size}
                dispatch={dispatch}
                allRatings={allRatings}
                onSelectGame={this.handleSelectGame}
              />
            )}

            <div className="post-form__field-input">
              <div className="post-form__field-title">
                <FormattedMessage id="shared.post_field_title" />
              </div>
              <input className="post-form__input" value={title} onChange={this.handleInput} />
              {errors.title && errors.title.length > 0 && <Error kind="filed" error={errors.title[0]} />}
            </div>
            <div className="post-form__field-textarea">
              <div className="post-form__field-title">
                <FormattedMessage id="shared.post_field_text" />
              </div>
              {/* <textarea
                className="post-form__textarea"
                maxLength={FIELD_TEXTAREA_MAX_LENGTH}
                value={text}
                onChange={this.handleTextarea}
              /> */}
              <Editor
                text={text}
                onChange={this.handleTextarea}
                placeholder={intl.formatMessage({ id: 'post.form_placeholder' })}
              />
              {errors.text && errors.text.length > 0 && <Error kind="filed" error={errors.text[0]} />}
            </div>
          </div>

          <div className="post-form__controls">
            <div className="post-form__button">
              <Button kind="fill" size="medium" disabled={loading || !game} loading={loading}>
                <FormattedMessage id="post.form_button" />
              </Button>
            </div>
          </div>
        </form>
      </div>
    );
  }
}
