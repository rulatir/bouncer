import pkg from '../../package.json' with { type: 'json' };

/**
 * Return the package.json version via static JSON import.
 * If the import doesn't contain a version, return 'unknown'.
 */
export function getBouncerVersion(): string {
    return (pkg && (pkg as any).version) ?? 'unknown';
}
