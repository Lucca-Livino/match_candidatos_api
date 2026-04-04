const formatMessage = (level, message) => {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level}] ${message}`;
};

const logger = {
  info(message) {
    console.log(formatMessage('INFO', message));
  },
  error(message) {
    console.error(formatMessage('ERROR', message));
  },
};

export default logger;
