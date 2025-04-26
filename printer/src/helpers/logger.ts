import fs from 'fs';
import { Logger as TsLog } from 'tslog';
import { createStream } from 'rotating-file-stream';

export class Logger {

  private readonly LOGGER = new TsLog({ name: 'ordersystem' });
  private readonly stream = createStream(
    `./logs/${ this.LOGGER.settings.name }.log`,
    { size: '1000M' }       // rotate every 1 MegaBytes written
  );

  /**
   *
   * @param serviceName name of logger
   * @param minLevel 0: silly, 1: trace, 2: debug, 3: info, 4: warn, 5: error, 6: fatal
   */
  constructor(serviceName: string, minLevel = 3) {
    if (serviceName != undefined)
      this.LOGGER.settings.name = serviceName;

    if (minLevel != undefined) {
      this.LOGGER.settings.minLevel = minLevel;
    } else {
      this.LOGGER.settings.minLevel = 0;  // show everything
    }

    this.LOGGER.settings.hideLogPositionForProduction = true;

    if (!fs.existsSync('./logs')) {
      fs.mkdirSync('./logs');
    }

    this.LOGGER.attachTransport((logObj) => {
      this.stream.write(JSON.stringify(logObj) + '\n');
    });
  }

  public silly(content: unknown): void {
    this.LOGGER.silly(content);
  }

  public trace(content: unknown): void {
    this.LOGGER.trace(content);
  }

  public debug(content: unknown): void {
    this.LOGGER.debug(content);
  }

  public info(content: unknown): void {
    this.LOGGER.info(content);
  }

  public warn(content: unknown): void {
    this.LOGGER.warn(content);
  }

  public error(content: unknown): void {
    this.LOGGER.error(content);
  }

  public fatal(content: unknown): void {
    this.LOGGER.fatal(content);
  }

  public log(content: unknown): void {
    this.info(content);
  }
}
