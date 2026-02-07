import {
  sanitizeString,
  sanitizeEmail,
  sanitizeUsername,
  validatePassword,
  sanitizeUrl,
  sanitizeNumber,
  sanitizeObject,
} from '../../../lib/security/inputSanitizer';

describe('inputSanitizer', () => {
  it('sanitizes string by removing script tags and javascript protocol', () => {
    const input = ' hello <script>alert(1)</script> javascript:alert(2) ';
    const out = sanitizeString(input);
    expect(out).toBe('hello');
  });

  it('sanitizes email and validates format', () => {
    expect(sanitizeEmail(' TEST@Email.COM ')).toBe('test@email.com');
    expect(sanitizeEmail('bademail')).toBe('');
  });

  it('sanitizes username with allowed characters and length', () => {
    expect(sanitizeUsername(' user_name-1 ')).toBe('user_name-1');
    expect(sanitizeUsername('invalid!@#$%^&*()')).toBe('invalid');
    const long = 'a'.repeat(40);
    expect(sanitizeUsername(long)).toBe('a'.repeat(30));
  });

  it('validates password length', () => {
    expect(validatePassword('1234567')).toBe(false);
    expect(validatePassword('12345678')).toBe(true);
    expect(validatePassword('a'.repeat(129))).toBe(false);
  });

  it('sanitizes url to only allow http/https', () => {
    expect(sanitizeUrl('javascript:alert(1)')).toBe('');
    expect(sanitizeUrl('data:text/plain;base64,xx')).toBe('');
    expect(sanitizeUrl('http://example.com')).toBe('http://example.com');
    expect(sanitizeUrl('https://example.com')).toBe('https://example.com');
  });

  it('sanitizes number input', () => {
    expect(sanitizeNumber('12.5')).toBe(12.5);
    expect(sanitizeNumber('abc')).toBeNull();
    expect(sanitizeNumber(10)).toBe(10);
  });

  it('sanitizes object recursively', () => {
    const obj = { a: ' <script>x</script> ', b: { c: ' javascript:alert(1) ' } };
    const s = sanitizeObject(obj);
    expect(s.a).toBe('');
    expect(s.b.c).toBe('');
  });
});
