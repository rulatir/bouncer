import allStrategy from './all.mjs';
import filesStrategy from './files.mjs';
import gitStrategy from './git.mjs';
const strategies = {
    all: allStrategy,
    files: filesStrategy,
    git: gitStrategy,
};
function isValidStrategyKey(key) {
    return 'string' === typeof key && key in strategies;
}
export async function determineStrategy(sourceDir, options) {
    if (options?.strategy) {
        if (!isValidStrategyKey(options.strategy)) {
            throw new Error(`Invalid strategy key: ${options.strategy}`);
        }
        if (!await strategies[options.strategy].check(sourceDir)) {
            throw new Error(`Strategy ${options.strategy} not available for source directory ${sourceDir}`);
        }
        return strategies[options.strategy];
    }
    for (let strategyKey of ['files', 'git', 'all'])
        if (isValidStrategyKey(strategyKey)) {
            const strategy = strategies[strategyKey];
            if (await strategy.check(sourceDir)) {
                return strategy;
            }
        }
    throw new Error("No valid strategy found for source directory " + sourceDir);
}
