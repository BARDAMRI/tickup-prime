import {webcrypto} from 'node:crypto';
import {validateLicense} from './validateLicense';

const VALID_USER = 'test@example.com';
const VALID_KEY = 'TKUP-PRO-5GOV7OO99ZOZJTNDVXQN';
const MASTER_KEY = 'TICKUP-PRO-2026-BETA';

beforeAll(() => {
    if (!globalThis.crypto) {
        Object.defineProperty(globalThis, 'crypto', {
            value: webcrypto,
            configurable: true,
        });
    }
});

describe('validateLicense', () => {
    test('master key override always returns true', async () => {
        await expect(validateLicense(MASTER_KEY, null)).resolves.toBe(true);
        await expect(validateLicense(MASTER_KEY, '')).resolves.toBe(true);
        await expect(validateLicense(MASTER_KEY, 'anything@example.com')).resolves.toBe(true);
    });

    test('valid HMAC key/email pair returns true', async () => {
        await expect(validateLicense(VALID_KEY, VALID_USER)).resolves.toBe(true);
    });

    test('modified signature returns false', async () => {
        await expect(validateLicense('TKUP-PRO-5GOV7OO99ZOZJTNDVXQX', VALID_USER)).resolves.toBe(false);
    });

    test('valid key with wrong email returns false', async () => {
        await expect(validateLicense(VALID_KEY, 'other@example.com')).resolves.toBe(false);
    });

    test('edge cases: empty/null values and casing normalization', async () => {
        await expect(validateLicense('', VALID_USER)).resolves.toBe(false);
        await expect(validateLicense(null, VALID_USER)).resolves.toBe(false);
        await expect(validateLicense(VALID_KEY, '')).resolves.toBe(false);
        await expect(validateLicense(VALID_KEY, null)).resolves.toBe(false);

        // Email should normalize to lowercase.
        await expect(validateLicense(VALID_KEY, 'TEST@EXAMPLE.COM')).resolves.toBe(true);
        // Key parsing should accept lowercase format by normalizing internally.
        await expect(validateLicense(VALID_KEY.toLowerCase(), VALID_USER)).resolves.toBe(true);
    });
});

