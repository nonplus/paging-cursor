import PagingCursor from '../src/paging-cursor';

/**
 * PagingCursor test
 */
describe('PagingCursor test', () => {
  const context = { filter: 'test', sortBy: '+name' };

  describe('toString', () => {
    it('should create a URL-safe token', () => {
      for (let i = 0; i < 256; i++) {
        const token = new PagingCursor([String.fromCharCode(i).repeat(i + 1)], context).toString();
        expect(token).toEqual(encodeURIComponent(token));
      }
    });

    it('should create parsable token', () => {
      const values = [false, 123, 'hello'];
      const token = new PagingCursor(values, context).toString();
      const cursor = PagingCursor.parse(token);
      expect({
        context: cursor.context,
        values: cursor.values
      }).toEqual({
        context,
        values
      });
    });
  });

  describe('parse', () => {
    it('should create cursor from token', () => {
      for (let i = 0; i < 256; i++) {
        const values = [String.fromCharCode(i).repeat(i + 1)];
        const originalCursor = new PagingCursor(values, context);
        const token = originalCursor.toString();
        const cursor = PagingCursor.parse(token);
        expect({
          context: cursor.context,
          values: cursor.values
        }).toEqual({
          context,
          values
        });
      }
    });
  });

  describe('compare', () => {
    const smallCursor = new PagingCursor([false, 'hello', 2]);
    const largeCursor = new PagingCursor([false, 'hello', 10]);

    it('should return 0 for equal cursors/tokens', () => {
      expect(PagingCursor.compare(smallCursor, smallCursor)).toEqual(0);
      expect(PagingCursor.compare(smallCursor, smallCursor.toString())).toEqual(0);
      expect(PagingCursor.compare(smallCursor.toString(), smallCursor)).toEqual(0);
      expect(PagingCursor.compare(smallCursor.toString(), smallCursor.toString())).toEqual(0);
    });

    it('should return <0 for cursor/token a < b', () => {
      expect(PagingCursor.compare(smallCursor, largeCursor)).toBeLessThan(0);
      expect(PagingCursor.compare(smallCursor, largeCursor.toString())).toBeLessThan(0);
      expect(PagingCursor.compare(smallCursor.toString(), largeCursor)).toBeLessThan(0);
      expect(PagingCursor.compare(smallCursor.toString(), largeCursor.toString())).toBeLessThan(0);
    });

    it('should return >0 for tokens a > b', () => {
      expect(PagingCursor.compare(largeCursor, smallCursor)).toBeGreaterThan(0);
      expect(PagingCursor.compare(largeCursor, smallCursor.toString())).toBeGreaterThan(0);
      expect(PagingCursor.compare(largeCursor.toString(), smallCursor)).toBeGreaterThan(0);
      expect(PagingCursor.compare(largeCursor.toString(), smallCursor.toString())).toBeGreaterThan(
        0
      );
    });

    it('should consider descending arguments', () => {
      const smallDescCursor = new PagingCursor([false, 'hello', 10], null, [false, false, true]);
      const largeDescCursor = new PagingCursor([false, 'hello', 2], null, [false, false, true]);

      expect(PagingCursor.compare(smallDescCursor, largeDescCursor)).toBeLessThan(0);
      expect(PagingCursor.compare(smallDescCursor, largeDescCursor.toString())).toBeLessThan(0);
      expect(PagingCursor.compare(smallDescCursor.toString(), largeDescCursor)).toBeLessThan(0);
      expect(
        PagingCursor.compare(smallDescCursor.toString(), largeDescCursor.toString())
      ).toBeLessThan(0);

      expect(PagingCursor.compare(largeDescCursor, smallDescCursor)).toBeGreaterThan(0);
      expect(PagingCursor.compare(largeDescCursor, smallDescCursor.toString())).toBeGreaterThan(0);
      expect(PagingCursor.compare(largeDescCursor.toString(), smallDescCursor)).toBeGreaterThan(0);
      expect(
        PagingCursor.compare(largeDescCursor.toString(), smallDescCursor.toString())
      ).toBeGreaterThan(0);

      expect(PagingCursor.compare(largeDescCursor, largeDescCursor)).toEqual(0);
      expect(PagingCursor.compare(largeDescCursor, largeDescCursor.toString())).toEqual(0);
      expect(PagingCursor.compare(largeDescCursor.toString(), largeDescCursor)).toEqual(0);
      expect(PagingCursor.compare(largeDescCursor.toString(), largeDescCursor.toString())).toEqual(
        0
      );
    });
  });
});
