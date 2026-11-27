/**
 * Pure validation helpers for AuctionMe Sign Up (Screen 02).
 * Uses AuctionMe ID + Password only (no email/phone/OTP/MFA).
 */

const AUCTIONME_ID_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9._-]{2,29}$/;
const SPECIAL_CHAR_REGEX = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/;

export function evaluatePasswordRules(password = '') {
  const minLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = SPECIAL_CHAR_REGEX.test(password);

  const passedCount = [minLength, hasUppercase, hasNumber, hasSpecial].filter(
    Boolean
  ).length;

  let strength = 'empty';
  if (password.length > 0) {
    if (passedCount <= 1) strength = 'weak';
    else if (passedCount === 2) strength = 'fair';
    else if (passedCount === 3) strength = 'good';
    else strength = 'strong';
  }

  return {
    minLength,
    hasUppercase,
    hasNumber,
    hasSpecial,
    passedCount,
    isValid: minLength && hasUppercase && hasNumber && hasSpecial,
    strength,
  };
}

export function validateDisplayName(value = '') {
  const trimmed = value.trim();
  if (!trimmed) return 'Please enter your display name.';
  if (trimmed.length < 2) return 'Display name must be at least 2 characters.';
  if (trimmed.length > 60) return 'Display name must be 60 characters or fewer.';
  return null;
}

export function validateAuctionMeId(value = '') {
  const trimmed = value.trim();
  if (!trimmed) return 'Please choose an AuctionMe ID.';
  if (trimmed.length < 3) return 'AuctionMe ID must be at least 3 characters.';
  if (trimmed.length > 30) return 'AuctionMe ID must be 30 characters or fewer.';
  if (!AUCTIONME_ID_REGEX.test(trimmed)) {
    return 'Use letters, numbers, dots, hyphens, or underscores (start with a letter or number).';
  }
  return null;
}

export function validatePassword(password = '') {
  if (!password) return 'Please create a password.';
  const rules = evaluatePasswordRules(password);
  if (!rules.isValid) {
    return 'Password does not meet all security requirements.';
  }
  return null;
}

export function validateConfirmPassword(password = '', confirmPassword = '') {
  if (!confirmPassword) return 'Please re-enter your password.';
  if (password !== confirmPassword) return 'Passwords do not match.';
  return null;
}

export function validateSignupForm({
  displayName,
  auctionMeId,
  password,
  confirmPassword,
}) {
  const errors = {
    displayName: validateDisplayName(displayName),
    auctionMeId: validateAuctionMeId(auctionMeId),
    password: validatePassword(password),
    confirmPassword: validateConfirmPassword(password, confirmPassword),
  };

  const isValid = Object.values(errors).every((err) => err === null);
  return { errors, isValid };
}
