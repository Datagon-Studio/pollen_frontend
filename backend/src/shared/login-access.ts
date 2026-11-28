export const loginMessages = {
  wrongDetails: 'Wrong login details.',
  emailUnconfirmed: 'Confirm your email before signing in.',
  tooManyAttempts: 'Too many sign-in attempts. Wait a moment and try again.',
  accountSuspended: 'This account has been suspended.',
  membershipSuspended: 'This membership has been suspended.',
  accountDeactivated: 'This account has been deactivated.',
  notInAccount: 'You are not part of this account.',
  notAMember: 'You are not a member of this account.',
  notLinked: 'This login is not linked to an account.',
  notStaff: 'This login is not a system admin account.',
  wrongCode: 'Wrong login code.',
  expiredCode: 'This login code has expired. Request a new one.',
  accountNotFound: 'Account not found.',
} as const;

export class LoginAccessError extends Error {
  code: string;
  statusCode: number;

  constructor(message: string, code: string, statusCode = 403) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}

export function otpFailureMessage(providerError: string | undefined): string {
  const text = (providerError || '').toLowerCase();
  if (text.includes('expired')) return loginMessages.expiredCode;
  if (text.includes('invalid code') || text.includes('invalid otp') || text.includes('wrong')) {
    return loginMessages.wrongCode;
  }
  return loginMessages.wrongCode;
}
