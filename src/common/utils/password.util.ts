import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

export const PASSWORD_MIN_LENGTH = 8;

export const PASSWORD_VALIDATION_MESSAGE =
  'Password must be at least 8 characters long and include one uppercase letter, one number, and one special character';

export function isStrongPassword(value: string): boolean {
  if (!value || typeof value !== 'string') return false;
  if (value.length < PASSWORD_MIN_LENGTH) return false;
  if (!/[A-Z]/.test(value)) return false;
  if (!/\d/.test(value)) return false;
  if (!/[^A-Za-z0-9]/.test(value)) return false;
  return true;
}

export function generateStrongPassword(length = 12): string {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const digits = '0123456789';
  const special = '!@#$%^&*';
  const all = upper + lower + digits + special;
  const minLength = Math.max(length, PASSWORD_MIN_LENGTH);

  const pick = (chars: string) =>
    chars[Math.floor(Math.random() * chars.length)];

  const chars = [pick(upper), pick(digits), pick(special)];
  while (chars.length < minLength) {
    chars.push(pick(all));
  }

  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join('');
}

@ValidatorConstraint({ name: 'isStrongPassword', async: false })
export class IsStrongPasswordConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return typeof value === 'string' && isStrongPassword(value);
  }

  defaultMessage(): string {
    return PASSWORD_VALIDATION_MESSAGE;
  }
}

export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsStrongPasswordConstraint,
    });
  };
}
