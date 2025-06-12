import { execSync } from 'child_process';
export function canResolve(specifier, importer) {
    try {
        execSync(`node --input-type=module -e "await import.meta.resolve('${specifier}', '${importer}')"`, { stdio: 'pipe' });
        return true;
    }
    catch {
        return false;
    }
}
