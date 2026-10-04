/**
 * Strict Reusable Numeric PIN Validator (Server-Side)
 * Uddhyamsheel Group Management System
 * 
 * Never trusts frontend validation.
 * Enforces:
 * - Proper string type
 * - Strict numeric-only ASCII 0-9 characters
 * - Exact configured length (6-digit Member, 4-digit Admin)
 * - Rejection of spaces, decimals, signs, symbols, and trivial patterns
 */

export const SERVER_MEMBER_PIN_LENGTH = 6;
export const SERVER_ADMIN_PIN_LENGTH = 4;

export interface ServerPinValidationResult {
  valid: boolean;
  error?: string;
}

const WEAK_PATTERNS = new Set([
  '123456',
  '654321',
  '012345',
  '543210',
  '12345678',
  '87654321',
  '000000',
  '111111',
  '222222',
  '333333',
  '444444',
  '555555',
  '666666',
  '777777',
  '888888',
  '999999',
  '121212',
  '123123',
  '0000',
  '1111',
  '2222',
  '3333',
  '4444',
  '5555',
  '6666',
  '7777',
  '8888',
  '9999',
  '1234',
  '4321'
]);

export function validateServerNumericPin(
  pin: unknown,
  expectedLength: number = 6,
  fieldName: string = 'PIN',
  enforceStrength: boolean = false
): ServerPinValidationResult {
  if (typeof pin !== 'string') {
    return {
      valid: false,
      error: `${fieldName} must be a valid text string.`
    };
  }

  // Reject spaces
  if (/\s/.test(pin)) {
    return {
      valid: false,
      error: `${fieldName} must not contain spaces.`
    };
  }

  // Strictly check ASCII digits only (0-9)
  if (!/^[0-9]+$/.test(pin)) {
    return {
      valid: false,
      error: `${fieldName} must contain only numeric digits (0-9). Letters, decimals, and special characters are not permitted.`
    };
  }

  // Exact length check
  if (pin.length !== expectedLength) {
    return {
      valid: false,
      error: `${fieldName} must contain exactly ${expectedLength} digits.`
    };
  }

  if (enforceStrength) {
    if (WEAK_PATTERNS.has(pin)) {
      return {
        valid: false,
        error: `${fieldName} is too simple or predictable (cannot use sequential or repeated digits).`
      };
    }

    const allSame = pin.split('').every((char) => char === pin[0]);
    if (allSame) {
      return {
        valid: false,
        error: `${fieldName} cannot consist of all identical digits.`
      };
    }
  }

  return { valid: true };
}
