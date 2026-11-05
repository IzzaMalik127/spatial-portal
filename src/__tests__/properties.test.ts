import { cleanProperties } from '../utils/properties';

describe('cleanProperties', () => {
  it('removes undefined, null and empty-string values', () => {
    expect(cleanProperties({ a: 1, b: undefined, c: null, d: '', e: 'x' })).toEqual({ a: 1, e: 'x' });
  });
  it('keeps meaningful falsy values (0 and false)', () => {
    expect(cleanProperties({ floors: 0, active: false })).toEqual({ floors: 0, active: false });
  });
});
