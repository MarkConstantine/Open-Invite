const { createLogger, format, transports } = require("winston");
const { combine, timestamp, printf } = format;

const myFormat = printf(({ level, message, timestamp }) => {
  const dateTimeFormat = new Date(timestamp).toLocaleString("en-GB").replace(",", "");
  return `${level.toUpperCase()} ${dateTimeFormat} ${message}`;
});

const logger = createLogger({
  format: combine(timestamp(), myFormat),
  transports: [new transports.Console()],
  level: "debug",
});

module.exports = function(module) {
  const filename = module.filename.replace(/^.*[\\/]/, '');
  return {
    error: function(message, variables) {
      logger.error(`${filename}: ${message}`, variables);
    },
    warn: function (message, variables) {
      logger.warn(`${filename}: ${message}`, variables);
    },
    info: function(message, variables) {
      logger.info(`${filename}: ${message}`, variables);
    },
    debug: function (message, variables) {
      logger.debug(`${filename}: ${message}`, variables);
    },
  };
};
