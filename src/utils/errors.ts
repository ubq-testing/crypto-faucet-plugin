export function throwError(err: string, rest?: object) {
    const logger = new Logs("debug");
    const error = logger.error(err, rest);
    throw new Error(`${error?.logMessage.diff}\n${JSON.stringify(error?.metadata, null, 2)}`);
  }