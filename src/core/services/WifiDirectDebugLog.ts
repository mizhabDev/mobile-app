export class WifiDirectDebugLog {
  private static entries: string[] = [];
  private static readonly maxEntries = 250;

  static clear() {
    this.entries = [];
  }

  static add(message: string, data?: unknown) {
    const timestamp = new Date().toISOString();
    const suffix = data === undefined ? '' : ` ${this.stringify(data)}`;
    const entry = `${timestamp} ${message}${suffix}`;

    this.entries.push(entry);
    if (this.entries.length > this.maxEntries) {
      this.entries.shift();
    }
  }

  static text() {
    return this.entries.join('\n');
  }

  private static stringify(data: unknown) {
    if (data instanceof Error) {
      return JSON.stringify({
        name: data.name,
        message: data.message,
        stack: data.stack,
      });
    }

    try {
      return JSON.stringify(data);
    } catch {
      return String(data);
    }
  }
}
