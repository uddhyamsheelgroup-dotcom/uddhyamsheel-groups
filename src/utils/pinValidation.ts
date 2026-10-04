/**
 * Strict Reusable Numeric PIN Validator (Frontend)
 * Uddhyamsheel Group Management System
 * 
 * Enforces strict ASCII numeric digits (0-9) and prevents insecure/obvious patterns.
 * 
 * Configured PIN lengths:
 * - Member Portal PIN: Exactly 6 digits (6-digit standard)
 * - Administrator PIN: 6 to 8 digits (6-8 digit standard)
 */

export const MEMBER_PIN_LENGTH = 6;
export const ADMIN_PIN_MIN_LENGTH = 6;
export const ADMIN_PIN_MAX_LENGTH = 8;
export const ADMIN_PIN_LENGTH = 6; // Default display length

export interface PinValidationResult {
  isValid: boolean;
  error?: string;
}

// Common weak / sequential / repetitive PIN patterns to reject
const DISALLOWED_SEQUENCES = [
  '123456',
  '654321',
  '012345',
  '543210',
  '1234567',
  '7654321',
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
  '0000000',
  '1111111',
  '00000000',
  '11111111',
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
];

/**
 * Validates that a PIN consists solely of ASCII digits 0-9 and falls within [minLength, maxLength],
 * and optionally ensures it does not match obvious repeated or sequential patterns.
 */
export function validateNumericPinRange(
  pin: string,
  minLength: number,
  maxLength: number,
  fieldName: string = 'PIN',
  checkStrength: boolean = true
): PinValidationResult {
  if (!pin || pin.length === 0) {
    return {
      isValid: false,
      error: `${fieldName} is required.`
    };
  }

  // Reject spaces
  if (/\s/.test(pin)) {
    return {
      isValid: false,
      error: `${fieldName} must not contain spaces.`
    };
  }

  // Strictly check ASCII digits only (0-9)
  if (!/^[0-9]+$/.test(pin)) {
    return {
      isValid: false,
      error: `${fieldName} must contain only numeric digits (0-9). Letters, decimals, and special characters are not permitted.`
    };
  }

  // Length check
  if (minLength === maxLength) {
    if (pin.length !== minLength) {
      return {
        isValid: false,
        error: `${fieldName} must contain exactly ${minLength} digits.`
      };
    }
  } else {
    if (pin.length < minLength || pin.length > maxLength) {
      return {
        isValid: false,
        error: `${fieldName} must contain between ${minLength} and ${maxLength} digits.`
      };
    }
  }

  // Check weak patterns if requested (for new PIN creation / PIN changes)
  if (checkStrength) {
    if (DISALLOWED_SEQUENCES.includes(pin)) {
      return {
        isValid: false,
        error: `${fieldName} is too simple or predictable (cannot use sequential digits like 123456 or repeated digits like 000000).`
      };
    }

    // Check all identical digits (e.g. 777777)
    const allSame = pin.split('').every((char) => char === pin[0]);
    if (allSame) {
      return {
        isValid: false,
        error: `${fieldName} cannot consist of all identical digits.`
      };
    }
  }

  return { isValid: true };
}

/**
 * Validates that a PIN matches exact expected length (wrapper around validateNumericPinRange)
 */
export function validateNumericPin(
  pin: string,
  expectedLength: number = 6,
  fieldName: string = 'PIN',
  checkStrength: boolean = true
): PinValidationResult {
  return validateNumericPinRange(pin, expectedLength, expectedLength, fieldName, checkStrength);
}

/**
 * Validates Member PIN (strictly 6 digits)
 */
export function validateMemberPin(
  pin: string,
  fieldName: string = 'Member PIN',
  checkStrength: boolean = true
): PinValidationResult {
  return validateNumericPinRange(pin, 6, 6, fieldName, checkStrength);
}

/**
 * Validates Admin PIN (6 to 8 digits)
 */
export function validateAdminPin(
  pin: string,
  fieldName: string = 'Admin PIN',
  checkStrength: boolean = true
): PinValidationResult {
  return validateNumericPinRange(pin, ADMIN_PIN_MIN_LENGTH, ADMIN_PIN_MAX_LENGTH, fieldName, checkStrength);
}

/**
 * Validates PIN confirmation match
 */
export function validatePinMatch(pin: string, confirmPin: string, fieldName: string = 'New PIN'): PinValidationResult {
  if (pin !== confirmPin) {
    return {
      isValid: false,
      error: `${fieldName} and confirmation do not match.`
    };
  }
  return { isValid: true };
}
