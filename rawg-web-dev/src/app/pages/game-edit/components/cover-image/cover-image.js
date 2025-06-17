import React from 'react';
import PropTypes from 'prop-types';
import cn from 'classnames';
import { hot } from 'react-hot-loader';
import { connect } from 'react-redux';

import path from 'ramda/src/path';

import AddBtn from 'app/pages/game-edit/components/add-btn';
import addIcon from 'assets/icons/add.svg';
import replaceIcon from 'assets/icons/replace.svg';
import thinkingIcon from 'assets/icons/emoji/thinking.png';
import { updateField } from 'app/pages/game-edit/actions/common';

import './cover-image.styl';

const name = 'image';

@hot(module)
@connect((state) => ({
  currentValue: path(['gameEdit', name, 'current'], state),
  changedValue: path(['gameEdit', name, 'changed'], state),
}))
class CoverImage extends React.Component {
  static propTypes = {
    placeholder: PropTypes.node,
    currentValue: PropTypes.string,
    changedValue: PropTypes.shape(),
    readOnly: PropTypes.bool,
    addText: PropTypes.node,
    changeText: PropTypes.node,
    dispatch: PropTypes.func.isRequired,
  };

  static defaultProps = {
    currentValue: undefined,
    changedValue: undefined,
    readOnly: false,
    placeholder: 'Add some items',
    addText: 'Add',
    changeText: 'Change',
  };

  constructor(props) {
    super(props);

    const { currentValue } = this.props;

    this.state = {
      oldVal: currentValue,
      avatarChanged: false,
      avatarSource: '',
    };
  }

  static getDerivedStateFromProps(props, state) {
    const oldValue = state.oldVal;
    const value = props.currentValue;
    if (oldValue !== value) {
      return {
        oldVal: props.currentValue,
        avatarChanged: false,
        avatarSource: '',
      };
    }

    return null;
  }

  onSelectFile = (event) => {
    const { dispatch } = this.props;
    const file = event.target.files[0];

    if (file && file !== this.file) {
      this.file = file;

      dispatch(updateField(name, file));

      const reader = new FileReader();

      reader.addEventListener('load', (e) => {
        this.setState({
          avatarChanged: true,
          avatarSource: e.target.result,
        });
      });
      reader.readAsDataURL(file);
    }
  };

  render() {
    const { currentValue, changedValue, placeholder, readOnly, addText, changeText } = this.props;
    const { avatarChanged, avatarSource } = this.state;

    const value = changedValue || currentValue;
    const image = avatarChanged ? avatarSource : value;

    return (
      <div
        className={cn('game-edit__cover-image', {
          'game-edit__cover-image__readonly': readOnly,
        })}
      >
        {image && <div className="game-edit__cover-image__preview" style={{ backgroundImage: `url(${image})` }} />}
        <div className="game-edit__cover-image__add-btn__wrapper">
          {!readOnly && (
            <input
              className="game-edit__cover-image__file-input"
              type="file"
              autoComplete="off"
              onChange={this.onSelectFile}
            />
          )}
          <AddBtn
            className="game-edit__cover-image__add-btn"
            readOnly={readOnly}
            text={image ? changeText : addText}
            icon={image ? replaceIcon : addIcon}
          />
        </div>
        {!image && (
          <div className="game-edit__cover-image__empty-text">
            <span className="game-edit__cover-image__empty-text-emoji">
              <img src={thinkingIcon} alt="thinking face" />
            </span>
            {placeholder}
          </div>
        )}
      </div>
    );
  }
}

export default CoverImage;
