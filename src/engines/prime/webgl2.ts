/**
 * Prime runtime guard: WebGL2 is required for commercial Prime unlock.
 */
export function isWebGL2Supported(): boolean {
    if (typeof document === 'undefined') {
        return false;
    }
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2');
        return gl != null;
    } catch {
        return false;
    }
}
