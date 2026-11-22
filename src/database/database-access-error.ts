export class BrowserDatabaseError extends Error {
  constructor(
    public readonly kind: 'busy' | 'restart' | 'unsupported',
    message: string,
  ) {
    super(message);
    this.name = 'BrowserDatabaseError';
  }
}
