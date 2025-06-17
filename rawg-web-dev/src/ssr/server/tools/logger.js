import winston from 'winston';

export default winston.createLogger({
  transports: [
    new winston.transports.Console({
      timestamp: true,
      handleExceptions: true,
    }),
  ],
  exitOnError: false,
});
