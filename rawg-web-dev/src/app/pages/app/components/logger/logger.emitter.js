import without from 'ramda/src/without';
import config from 'config/config';

class LoggerEmitterClass {
  constructor() {
    this.listeners = [];
  }

  subscribe = (listener) => {
    this.listeners.push(listener);
  };

  unsubscribe = (listener) => {
    this.listeners = without([listener], this.listeners);
  };

  emit = (message) => {
    if (config.loggerGroups[message.group]) {
      this.listeners.forEach((listener) => {
        listener(message);
      });
    }
  };
}

const LoggerEmitter = new LoggerEmitterClass();

export default LoggerEmitter;
