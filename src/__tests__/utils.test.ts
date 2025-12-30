import { cn } from '@/lib/utils';

describe('cn utility', () => {
  it('should merge class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('should handle conditional classes', () => {
    expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz');
  });

  it('should handle undefined values', () => {
    expect(cn('foo', undefined, 'bar')).toBe('foo bar');
  });

  it('should handle empty strings', () => {
    expect(cn('foo', '', 'bar')).toBe('foo bar');
  });

  it('should merge Tailwind classes properly', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
  });

  it('should handle array of classes', () => {
    expect(cn(['foo', 'bar'])).toBe('foo bar');
  });

  it('should handle object syntax', () => {
    expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz');
  });
});
