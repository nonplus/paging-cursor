/**
 * Serializable paging cursor
 */

/**
 * @hidden
 */
type MetaInfo = {
  $ctx?: any;
  $dsc?: boolean[];
};

export default class PagingCursor {
  /**
   * Construct a paging cursor from a cursor token
   * @param token A token returned from {@link PagingCursor#.toString}
   * @returns A paging cursor instance.
   */
  public static parse(token: string): PagingCursor {
    const [metaInfo, ...values] = JSON.parse(PagingCursor.fromUrlSafeBase64(token)) as [
      MetaInfo,
      ...any[]
    ];
    return new PagingCursor(values, metaInfo.$ctx, metaInfo.$dsc);
  }

  /**
   * Compare two paging cursors (or tokens) based on their {@link values} and {@link descending} properties.
   *
   * @param a A paging cursor or cursor token
   * @param b A paging cursor or cursor token
   * @returns 0, -1 or 1 when cursor A is lt, eq or gt cursor B, respectively.
   */
  public static compare(a: PagingCursor | string, b: PagingCursor | string): number {
    const aCursor = typeof a === 'string' ? PagingCursor.parse(a) : a;
    const bCursor = typeof b === 'string' ? PagingCursor.parse(b) : b;
    const desc = aCursor.descending || [];
    for (let i = 0; i < aCursor.values.length; i++) {
      const aValue = aCursor.values[i];
      const bValue = bCursor.values[i];

      if (aValue < bValue) {
        return desc[i] ? 1 : -1;
      } else if (aValue > bValue) {
        return desc[i] ? -1 : 1;
      }
    }
    return 0;
  }

  private static readonly unsafeBase64Char = /[+=\/]/g;
  private static readonly mapToSafeBase64Char: { [c: string]: string } = {
    '+': '-',
    '/': '_',
    '=': ''
  };
  private static readonly safeBase64Char = /[-_]/g;
  private static readonly mapFromSafeBase64Char: { [c: string]: string } = { '-': '+', _: '/' };

  /**
   * Convert a string to a url-safe base64 encoding.
   * @param raw The string to encode.
   * @returns The encoded string.
   */
  private static toUrlSafeBase64(raw: string): string {
    const baser64 = new Buffer(raw, 'binary').toString('base64');
    return baser64.replace(
      PagingCursor.unsafeBase64Char,
      char => PagingCursor.mapToSafeBase64Char[char]
    );
  }

  /**
   * Convert a string from a url-safe base64 encoding.
   * @param safeBase64 The string to decode.
   * @returns The decoded string.
   */
  private static fromUrlSafeBase64(safeBase64: string): string {
    const base64 = safeBase64.replace(
      PagingCursor.safeBase64Char,
      char => PagingCursor.mapFromSafeBase64Char[char]
    );
    return new Buffer(base64, 'base64').toString('binary');
  }

  /**
   * @param values The values identifying a row of data (in sort-column order)
   * @param context Optional additional context (e.g. filter, orderBy, etc.) used by the cursor
   * @param descending Optional flags indicated which columns are compared in descending order.  Used by {@link PagingCursor.compare}.
   */
  constructor(readonly values: any[], readonly context?: any, readonly descending?: boolean[]) {}

  /**
   * Convert paging cursor to a URL-safe token
   */
  public toString(): string {
    const metaInfo: MetaInfo = { $ctx: this.context, $dsc: this.descending };
    if (metaInfo.$ctx === undefined) {
      delete metaInfo.$ctx;
    }
    if (metaInfo.$dsc === undefined) {
      delete metaInfo.$dsc;
    }
    return PagingCursor.toUrlSafeBase64(JSON.stringify([metaInfo, ...this.values]));
  }

  /**
   * Reverse the direction of the cursor by inverting its {@link descending} flags.
   */
  public reverse(): void {
    const direction = this.descending;
    if (direction) {
      for (let i = direction.length - 1; i >= 0; i--) {
        direction[i] = !direction[i];
      }
    }
  }
}
