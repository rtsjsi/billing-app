import { describe, expect, it } from 'vitest';
import { isWorkChecked } from './po-work';

describe('isWorkChecked', () => {
  it('treats only an explicit checked flag as confirmed', () => {
    expect(isWorkChecked(true)).toBe(true);
    expect(isWorkChecked(1)).toBe(true);
    expect(isWorkChecked('1')).toBe(true);
    expect(isWorkChecked('true')).toBe(true);
  });

  it('treats unchecked, null, and other values as not confirmed', () => {
    expect(isWorkChecked(false)).toBe(false);
    expect(isWorkChecked(0)).toBe(false);
    expect(isWorkChecked('0')).toBe(false);
    expect(isWorkChecked(null)).toBe(false);
    expect(isWorkChecked(undefined)).toBe(false);
    expect(isWorkChecked('')).toBe(false);
  });
});
