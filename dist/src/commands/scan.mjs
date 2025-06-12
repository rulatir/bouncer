import { determineStrategy } from "../strategy/index.mjs";
import process from "node:process";
import resolvePath from "../util/resolvePath.mjs";
export async function scan(destinationDir) {
    const strategy = await determineStrategy(destinationDir);
    await strategy.performScan(destinationDir);
}
export function defineScanCommand(program) {
    program
        .command('scan')
        .description('List all own files of the project')
        .option('--path <path>', 'Path to scan (default: current working dir)', process.cwd())
        .action(async (opts) => {
        const pathToScan = resolvePath(opts.path);
        await scan(pathToScan);
    });
}
