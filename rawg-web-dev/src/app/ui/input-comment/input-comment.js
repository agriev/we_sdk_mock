import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import classnames from 'classnames';
import autosize from 'autosize';
import { injectIntl, FormattedMessage } from 'react-intl';

import checkLogin from 'tools/check-login';

import appHelper from 'app/pages/app/app.helper';
import Button from 'app/ui/button';
import Avatar from 'app/ui/avatar';
import currentUserType from 'app/components/current-user/current-user.types';
import { appSizeType } from 'app/pages/app/app.types';
import intlShape from 'tools/prop-types/intl-shape';

import './input-comment.styl';

const COMMENT_MAX_LENGTH = 3000;

@injectIntl
@connect((state) => ({
  size: state.app.size,
  currentUser: state.currentUser,
}))
export default class InputComment extends Component {
  static propTypes = {
    kind: PropTypes.oneOf(['reply', 'reply-child']),
    autoFocus: PropTypes.bool,
    onSubmit: PropTypes.func,
    className: PropTypes.string,
    placeholder: PropTypes.string,
    value: PropTypes.string,

    dispatch: PropTypes.func.isRequired,
    intl: intlShape.isRequired,
    size: appSizeType.isRequired,
    currentUser: currentUserType.isRequired,
  };

  static defaultProps = {
    kind: undefined,
    autoFocus: false,
    onSubmit: undefined,
    className: '',
    placeholder: '',
    value: '',
  };

  constructor(props) {
    super(props);

    const { value } = this.props;

    this.ref = {};
    this.state = { value, isFocus: false };
  }

  componentDidMount() {
    const { autoFocus } = this.props;

    autosize(this.ref.input);

    if (autoFocus) {
      setTimeout(() => {
        this.ref.input.focus();
      }, 20);
    }
  }

  componentDidUpdate() {
    setTimeout(() => {
      autosize.update(this.ref.input);
    }, 100);
  }

  componentWillUnmount() {
    window.removeEventListener('keydown', this.handleKeydown);
  }

  getClassName() {
    const { className, kind } = this.props;

    return classnames('input-comment', {
      [`input-comment_${kind}`]: kind,
      [className]: className,
    });
  }

  handleSubmit = (e) => {
    e.preventDefault();

    const { onSubmit } = this.props;
    const { value } = this.state;

    if (typeof onSubmit === 'function') {
      onSubmit(value);
    }

    this.setState({ value: '' });
  };

  handleChange = (e) => {
    this.setState({ value: e.target.value });
  };

  handleFocus = () => {
    const { dispatch } = this.props;

    checkLogin(dispatch, () => {
      window.addEventListener('keydown', this.handleKeydown);
    });

    this.setState({ isFocus: true });
  };

  handleBlur = () => {
    window.removeEventListener('keydown', this.handleKeydown);
    this.setState({ isFocus: false });
  };

  handleKeydown = (e) => {
    if (((e.key && e.key === 'Enter') || e.keyCode === 13) && !e.shiftKey) {
      this.handleSubmit(e);
    }
  };

  render() {
    const { intl, size, currentUser, placeholder } = this.props;
    const { value } = this.state;

    const placeholderString = intl.formatMessage({
      id: placeholder || 'shared.input_comment_placeholder',
    });

    return (
      <div className={this.getClassName()}>
        <form className="input-comment__form-wrapper" onSubmit={this.handleSubmit}>
          <div className="input-comment__form">
            <Avatar
              className={classnames('input-comment__avatar', {
                'input-comment__focus': !this.state.isFocus,
              })}
              size={40}
              src={currentUser.avatar}
              profile={currentUser}
            />
            <textarea
              className="input-comment__field"
              placeholder={placeholderString}
              value={value}
              maxLength={COMMENT_MAX_LENGTH}
              rows="1"
              ref={(reference) => {
                this.ref.input = reference;
              }}
              onFocus={this.handleFocus}
              onBlur={this.handleBlur}
              onChange={this.handleChange}
            />
          </div>
          {appHelper.isPhoneSize({ size }) && value.length > 0 && (
            <Button size="medium" kind="fill-inline">
              <FormattedMessage id="shared.input_comment_button" />
            </Button>
          )}
        </form>
        {appHelper.isDesktopSize({ size }) && value.length > 0 && (
          <div className="input-comment__help-text">
            <FormattedMessage id="shared.input_comment_help_text" />
          </div>
        )}
      </div>
    );
  }
}
