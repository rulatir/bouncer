import { resolve } from 'path';
import { applyTransform } from '../../lib/transform-harness.mjs';
import { fixImportsTransform } from '../../lib/transforms/fix-imports.mjs';
import { determineStrategy } from '../strategy/index.mjs';
export function defineFixImportsCommand(program) {
    program
        .command('fix-imports')
        .description('Fix extensionless imports by adding .mjs or /index.mjs extensions')
        .option('--dir <directory>', 'Directory to process (default: current working directory)', process.cwd())
        .action(async (options) => {
        const targetDir = resolve(options.dir);
        const strategy = await determineStrategy(targetDir);
        await applyTransform({
            targetDir,
            strategy,
            transform: fixImportsTransform,
            description: 'Processing extensionless imports'
        });
    });
}
