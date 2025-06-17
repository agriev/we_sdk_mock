import React from 'react';
import cn from 'classnames';

import padStart from 'lodash/padStart';

import evolve from 'ramda/src/evolve';
import append from 'ramda/src/append';
import T from 'ramda/src/T';
import reject from 'ramda/src/reject';
import propEq from 'ramda/src/propEq';

import adjustByProp from 'tools/ramda/adjust-by-property';

import LoggerEmitter from './logger.emitter';

import './logger.styl';

let lastId = 0;

const padZero = (number) => (number ? padStart(number, 2, '0') : '01');

class Logger extends React.Component {
  constructor(props) {
    super(props);

    LoggerEmitter.subscribe(this.addMessage);

    this.state = {
      messages: [],
    };
  }

  componentWillUnmount() {
    LoggerEmitter.unsubscribe(this.addMessage);
  }

  addMessage = ({ text }) => {
    lastId += 1;

    const message = {
      text,
      deleting: false,
      date: new Date(),
      id: lastId,
    };

    // eslint-disable-next-line no-console
    console.log(text);

    this.setState(evolve({ messages: append(message) }), this.markDeleted(message.id));
  };

  markDeleted = (id) => () => {
    const setDeleted = adjustByProp('id', id, evolve({ deleting: T }));

    setTimeout(() => {
      this.setState(evolve({ messages: setDeleted }), this.delMessage(id));
    }, 8000);
  };

  delMessage = (id) => () => {
    const delMessage = reject(propEq('id', id));
    setTimeout(() => {
      this.setState(evolve({ messages: delMessage }));
    }, 1000);
  };

  getTime = (date) => {
    const hours = date.getHours();
    const mins = padZero(date.getMinutes());
    const secs = padZero(date.getSeconds());
    const ms = padZero(date.getMilliseconds());
    return `${hours}:${mins}:${secs}:${ms}`;
  };

  render() {
    const { messages } = this.state;
    return (
      <div className="logger">
        {messages.map(({ id, deleting, date, text }) => (
          <div
            key={id}
            className={cn('logger__message', {
              logger__message_deleting: deleting,
            })}
          >
            {this.getTime(date)}: {text}
          </div>
        ))}
      </div>
    );
  }
}

export default Logger;
