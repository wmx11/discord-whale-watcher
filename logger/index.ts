import { createLogger, format, transports, Logger } from 'winston';
const { combine, timestamp, prettyPrint } = format;

const logger: Logger = createLogger({
  format: combine(timestamp(), prettyPrint()),
  transports: [new transports.Console(), new transports.File({ filename: 'combined.log' })],
});

export default logger;
