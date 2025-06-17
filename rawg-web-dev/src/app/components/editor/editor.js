import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { FormattedMessage } from 'react-intl';
import { hot } from 'react-hot-loader/root';
import validUrl from 'valid-url';
import SVGInline from 'react-svg-inline';
import unescape from 'lodash/unescape';
import { parse, stringify } from 'qs';
import urlParse from 'url-parse';
import get from 'lodash/get';

import importantIcon from 'assets/icons/important.svg';
import CloseButton from 'app/ui/close-button';
import Button from 'app/ui/button';
import Error from 'app/ui/error';
import ContentEditable from 'app/ui/content-editable';
import { uploadImage } from './editor.actions';
import './editor.styl';
import clearPastedData from './editor.funcs/clear-pasted-data';

const WHITELIST = ['youtube', 'vimeo', 'soundcloud', 'coub', 'twitch', 'youtu.be'];

@hot
@connect()
export default class Editor extends Component {
  static propTypes = {
    text: PropTypes.string,
    dispatch: PropTypes.func.isRequired,
    onChange: PropTypes.func,
    placeholder: PropTypes.string,
  };

  static defaultProps = {
    text: '',
    onChange: undefined,
    placeholder: '',
  };

  constructor(props) {
    super(props);

    const { text = '' } = this.props;

    this.state = {
      text,
      code: '',
      codeError: false,
      urlError: false,
      focus: false,
      menuVisible: false,
      popupVisible: false,
      uploadProcess: false,
      uploadProcessError: false,
      placeholderEnabled: true,
    };
  }

  componentDidMount() {
    window.addEventListener('keyup', this.handleKey);

    // console.log(this.contentEditable);
    // detectPaste(this.contentEditable);
  }

  static getDerivedStateFromProps(props, state) {
    if (props.text !== state.text) {
      return {
        text: props.text,
      };
    }

    return null;
  }

  shouldComponentUpdate(props, state) {
    return Object.keys(state).some((key) => state[key] !== this.state[key]);
  }

  componentWillUnmount() {
    window.removeEventListener('keyup', this.handleKey);
  }

  getCaretCoordinate = () => {
    let top = null;
    const sel = window && window.getSelection();

    if (!(sel && sel.focusNode)) return undefined;

    const range = sel.getRangeAt(0);
    const rangeRect = range.getBoundingClientRect();

    if (!rangeRect.top) {
      const span = document.createElement('span');
      span.innerHTML = '.';
      span.style.color = 'transparent';
      range.insertNode(span);
      top = Math.round(Math.max(15, span.offsetTop - 5));
      span.remove();
    } else {
      top = Math.round(rangeRect.top - this.editorEl.getBoundingClientRect().top - 5);
    }

    this.range = range;

    return top;
  };

  setMenuPosition = () => {
    if (!this.menuEl) return;

    const top = this.getCaretCoordinate();

    if (!top) return;

    this.menuEl.style.top = `${top}px`;
  };

  callChange = () => {
    const { onChange } = this.props;

    if (typeof onChange === 'function') {
      onChange(this.editorEl.querySelector('div[contenteditable]').innerHTML);
    }
  };

  handleKey = (e) => {
    const { focus } = this.state;

    if (!focus) return;

    if (
      (e.key && ['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'].includes(e.key)) ||
      (e.keyCode && [38, 39, 40, 37].includes(e.keyCode))
    ) {
      setTimeout(() => {
        this.setMenuPosition();
      }, 0);
    }
  };

  handleFocus = (e) => {
    if (e.target && e.target.parentElement && [...e.target.parentElement.classList].includes('editor__insertion')) {
      e.target.parentElement.remove();

      this.callChange();

      return;
    }

    this.setState({ menuVisible: true, focus: true, uploadProcess: false }, () => {
      this.setMenuPosition();
    });
  };

  handleBlur = () => {
    this.setState({ focus: false });

    setTimeout(() => {
      this.setState({ menuVisible: false });
    }, 500);
  };

  handleChange = () => {
    const { menuVisible } = this.state;

    if (this.changeTimeout) {
      window.clearTimeout(this.changeTimeout);
      this.changeTimeout = undefined;
    }

    this.changeTimeout = setTimeout(() => {
      if (!menuVisible) {
        this.setState({ menuVisible: true, uploadProcess: false }, () => {
          this.setMenuPosition();
        });
      } else {
        this.setState({ uploadProcess: false });
        this.setMenuPosition();
      }
    }, 100);

    this.callChange();
  };

  handlePaste = (e) => {
    // Stop data actually being pasted into div
    e.stopPropagation();
    e.preventDefault();

    // Get pasted data via clipboard API
    const clipboardData = e.clipboardData || window.clipboardData;
    const pastedData = clipboardData.getData('Text');

    const sel = window && window.getSelection();

    if (!(sel && sel.focusNode)) return;

    // Был такой вариант: вставлять медиа элемент сразу при вставке данных,
    // но на обсуждении его не приняли: https://rawg.slack.com/archives/G36RYMP9D/p1520928095000215
    // if (validUrl.isWebUri(pastedData) && this.tryInsertMediaLinkAsIframe(pastedData)) {
    //   this.handleChange(e);
    //   return;
    // }

    const range = sel.getRangeAt(0);
    const clearedPastedData = clearPastedData(pastedData)
      .replace(/<p[^>]*>/g, '')
      .replace(/<\/p>/g, '<br>');

    // Удалим выделенный блок текста
    const selection = window.getSelection();
    selection.getRangeAt(0).deleteContents();

    range.insertNode(window.document.createTextNode(clearedPastedData));

    selection.modify('move', 'forward', 'character');

    this.handleChange(e);
  };

  handleCodeChange = (e) => {
    const code = e.target.value;
    this.setState({ code, codeError: false, urlError: false });
  };

  uploadAndAddImage = (e) => {
    const { dispatch } = this.props;
    const image = e.target.files[0];

    if (!image) return;

    this.setState({
      uploadProcess: true,
      uploadProcessError: false,
    });

    dispatch(uploadImage(image))
      .then((res) => {
        const img = document.createElement('img');

        img.addEventListener('load', () => {
          this.setState({
            uploadProcess: false,
            uploadProcessError: false,
          });

          this.insert(img, this.range);
        });

        img.src = res.image;
      })
      .catch(() => {
        this.setState({
          uploadProcessError: true,
        });
      });
  };

  cleanFile = (e) => {
    e.stopPropagation();
    e.target.value = null;
  };

  findYoutubeUrl = (url) => {
    const { hostname, query, pathname } = urlParse(url);

    if (['youtu.be', 'www.youtube.com', 'youtube.com'].includes(hostname)) {
      const queryObject = parse(query.substring(1));
      let code;
      let start = 0;

      if (hostname === 'youtu.be') {
        code = pathname.substring(1);
      }
      if (hostname === 'www.youtube.com' || hostname === 'youtube.com') {
        code = queryObject.v;
      }

      if (queryObject && queryObject.t) {
        const mins = parseInt(get(/(\d*?)m/gm.exec(queryObject.t), '[1]', 0), 10) * 60;
        const secs = parseInt(get(/(\d*?)s/gm.exec(queryObject.t), '[1]', 0), 10);
        start = mins + secs;
      }

      queryObject.start = start;
      delete queryObject.v;
      delete queryObject.t;

      return `https://www.youtube.com/embed/${code}?${stringify(queryObject)}`;
    }

    return url;
  };

  tryInsertMediaLinkAsIframe = (stringArgument) => {
    if (!WHITELIST.some((resource) => stringArgument.includes(resource))) {
      this.setState({ urlError: true });
      return false;
    }

    const string = this.findYoutubeUrl(stringArgument);

    // str = strArg.replace('/watch?v=', '/embed/').replace('youtu.be/', 'youtube.com/embed/');
    // .replace('https://twitter.com', 'https://twitframe.com/show?url=https://twitter.com');

    const iframe = document.createElement('iframe');
    iframe.className = 'editor__iframe';
    iframe.setAttribute('sandbox', 'allow-same-origin allow-forms allow-popups allow-scripts allow-presentation');
    iframe.setAttribute('allowfullscreen', '');
    iframe.src = string;

    this.insert(iframe, this.range);
    this.closePopup();

    return true;
  };

  insertEnteredCode = (e, string) => {
    e.stopPropagation();
    e.preventDefault();

    let code;

    if (string) {
      code = string;
    } else {
      ({ code } = this.state);
    }

    code = unescape(
      clearPastedData(code, {
        nonTextTags: ['style', 'script', 'textarea', 'noscript', 'a', 'span', 'p', 'div'],
      }).replace('http://', 'https://'),
    );

    this.setState({ codeError: false, urlError: false });

    if (validUrl.isWebUri(code)) {
      this.tryInsertMediaLinkAsIframe(code);
      return;
    }

    const div = document.createElement('div');
    div.innerHTML = code;

    if (div.childElementCount === 1 && div.firstChild && ['IFRAME', 'EMBED'].includes(div.firstChild.tagName)) {
      div.firstChild.setAttribute(
        'sandbox',
        'allow-same-origin allow-forms allow-popups allow-scripts allow-presentation',
      );
      div.firstChild.setAttribute('allowfullscreen', '');
      this.insert(div.firstChild, this.range);
      this.togglePopup();
      div.remove();
    } else {
      this.setState({ codeError: true });
    }
  };

  insert = (element, range) => {
    if (!range) return;

    const { placeholderEnabled, text } = this.state;

    const mainLogic = () => {
      const div1 = document.createElement('div');
      const div2 = document.createElement('div');

      div1.className = 'editor__insertion';

      if (['IFRAME', 'EMBED'].includes(element.tagName)) {
        div2.className = 'editor__iframe-wrapper';
      }

      div1.appendChild(div2);
      div2.appendChild(element);

      if (text === '') {
        range.insertNode(document.createElement('br'));
      }

      range.insertNode(div1);

      this.callChange();
    };

    if (placeholderEnabled && text === '') {
      this.setState({ placeholderEnabled: false }, mainLogic);
    } else {
      mainLogic();
    }
  };

  togglePopup = () => {
    this.setState((state) => ({
      popupVisible: !state.popupVisible,
      codeError: false,
      urlError: false,
      code: '',
    }));
  };

  closePopup = () => {
    this.setState({
      popupVisible: false,
      codeError: false,
      urlError: false,
      code: '',
    });
  };

  renderMenu() {
    const { menuVisible } = this.state;

    return (
      <div
        className={`editor__menu ${menuVisible ? '' : 'editor__menu_hidden'}`}
        ref={(element) => {
          this.menuEl = element;
        }}
      >
        <div
          className="editor__menu-button editor__menu-button_code"
          onClick={this.togglePopup}
          role="button"
          tabIndex={0}
        />
        <div className="editor__menu-button editor__menu-button_image">
          <input type="file" onChange={this.uploadAndAddImage} onClick={this.cleanFile} />
        </div>
      </div>
    );
  }

  renderPopup() {
    const { code, codeError, urlError } = this.state;
    const errorMessage = <FormattedMessage id="shared.editor_url_error" values={{ whitelist: WHITELIST.join(', ') }} />;

    return (
      <div className="editor__popup">
        <div className="editor__popup-block">
          <div className="editor__popup-header">
            <div className="editor__popup-title">
              <FormattedMessage id="shared.editor_popup_title" />
            </div>
            <CloseButton className="editor__popup-close" onClick={this.togglePopup} />
          </div>
          <div className="editor__popup-body">
            <textarea className="editor__popup-textarea" value={code} onInput={this.handleCodeChange} />
            {codeError && <Error kind="field" error={<FormattedMessage id="shared.editor_code_error" />} />}
            {urlError && <Error kind="field" error={errorMessage} />}
            <div className="editor__popup-controls">
              <Button kind="outline" size="medium" onClick={this.togglePopup}>
                <FormattedMessage id="shared.editor_popup_cancel" />
              </Button>
              <Button kind="fill" size="medium" onClick={this.insertEnteredCode}>
                <FormattedMessage id="shared.editor_popup_insert" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  renderUploadProcess = () => {
    const { uploadProcessError } = this.state;

    return (
      <div className="editor__loader">
        {!uploadProcessError && <div className="editor__loader-icon" />}
        {uploadProcessError && [
          <SVGInline key="svg-icon" svg={importantIcon} />,
          <FormattedMessage
            key="text"
            id="review.form_upload_error"
            values={{
              link: (
                <span className="editor__loader__error-link">
                  <input type="file" onChange={this.uploadAndAddImage} onClick={this.cleanFile} />
                  <FormattedMessage id="review.form_upload_error_link_text" />
                </span>
              ),
            }}
          />,
        ]}
      </div>
    );
  };

  render() {
    const { text, popupVisible, uploadProcess, placeholderEnabled } = this.state;
    const { placeholder } = this.props;

    return (
      <div
        className="editor"
        ref={(element) => {
          this.editorEl = element;
        }}
      >
        <ContentEditable
          placeholder={placeholderEnabled ? placeholder : undefined}
          html={text || '<br>'}
          onBlur={this.handleBlur}
          onChange={this.handleChange}
          onClick={this.handleFocus}
          onPaste={this.handlePaste}
          ref={(element) => {
            this.contentEditable = element;
          }}
        />
        {this.renderMenu()}
        {popupVisible && this.renderPopup()}
        {uploadProcess && this.renderUploadProcess()}
      </div>
    );
  }
}
