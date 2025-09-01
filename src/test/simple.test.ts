import { describe, it, expect } from 'vitest';

describe('Simple Test', () => {
  it('should run a basic test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should test string matching', () => {
    expect('hello world').toContain('world');
  });

  it('should test object equality', () => {
    const obj = { name: 'test', value: 42 };
    expect(obj).toEqual({ name: 'test', value: 42 });
  });
});