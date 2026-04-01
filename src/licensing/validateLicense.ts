const PRIME_MASTER_KEY = 'TICKUP-PRO-2026-BETA';
const TICKUP_SECRET_KEY = 'BAr-TIckUp-S3cr3t-2026-Unique';

function toBase64Url(bytes: Uint8Array): string {
    let base64: string;
    if (typeof Buffer !== 'undefined') {
        base64 = Buffer.from(bytes).toString('base64');
    } else {
        let binary = '';
        for (const b of bytes) {
            binary += String.fromCharCode(b);
        }
        base64 = btoa(binary);
    }
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function parseLicenseKey(
    key: string,
): { plan: string; signature: string } | null {
    const normalized = key.trim().toUpperCase();
    if (!normalized.startsWith('TKUP-')) {
        return null;
    }
    const parts = normalized.split('-');
    if (parts.length < 3) {
        return null;
    }
    const signature = parts[parts.length - 1];
    const plan = parts.slice(1, parts.length - 1).join('-');
    if (!plan || !signature) {
        return null;
    }
    return {plan, signature};
}

/**
 * Prime license check (HMAC-SHA256).
 *
 * Keep this function as a small boundary so we can later replace the local rule
 * with an API validation or a cryptographic verification flow.
 */
export async function validateLicense(
    key?: string | null,
    userIdentifier?: string | null,
): Promise<boolean> {
    if (!key) {
        return false;
    }
    const normalizedKey = key.trim();
    if (!normalizedKey) {
        return false;
    }
    if (normalizedKey === PRIME_MASTER_KEY) {
        return true;
    }
    const parsed = parseLicenseKey(normalizedKey);
    if (!parsed) {
        return false;
    }
    const normalizedUser = (userIdentifier ?? '').trim().toLowerCase();
    if (!normalizedUser) {
        return false;
    }

    const payload = `${normalizedUser}|${parsed.plan}`;

    const cryptoApi = globalThis.crypto?.subtle;
    if (!cryptoApi) {
        return false;
    }

    const encoder = new TextEncoder();
    const cryptoKey = await cryptoApi.importKey(
        'raw',
        encoder.encode(TICKUP_SECRET_KEY),
        {name: 'HMAC', hash: 'SHA-256'},
        false,
        ['sign'],
    );
    const digest = await cryptoApi.sign('HMAC', cryptoKey, encoder.encode(payload));
    const signatureShort = toBase64Url(new Uint8Array(digest)).slice(0, 20).toUpperCase();
    return signatureShort === parsed.signature;
}

