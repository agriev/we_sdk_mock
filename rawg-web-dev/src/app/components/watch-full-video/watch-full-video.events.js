import EventEmitter from 'events';

const ee = new EventEmitter();

ee.setMaxListeners(1000);

class WatchFullVideoEventsClass {
  onPlayVideo = (func) => {
    ee.on('playVideo', func);
  };

  offPlayVideo = (func) => {
    ee.off('playVideo', func);
  };

  playVideo = ({ videoId }) => {
    ee.emit('playVideo', { videoId });
  };
}

const WatchFullVideoEvents = new WatchFullVideoEventsClass();

export default WatchFullVideoEvents;
