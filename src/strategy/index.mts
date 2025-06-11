// src/strategy/index.mts
import { readPackageJson } from '../util/fileSelection.mjs';
import allStrategy from './all.mjs';
import filesStrategy from './files.mjs';
import gitStrategy from './git.mjs';
import { BounceOptions } from '../commands/bounce.mjs';

export type StrategyKey = 'all' | 'files' | 'git';

export type Strategy = {
    name: StrategyKey;
    check: (sourceDir: string) => Promise<boolean>;
    collectFiles: (sourceDir: string, destDir? : string) => Promise<string[]>;
    performBounce: (options: BounceOptions) => Promise<void>;
    performScan: (bouncedDir: string) => Promise<void>;
    files?: string[];
};

const strategies = {
    all: allStrategy,
    files: filesStrategy,
    git: gitStrategy,
};

function isValidStrategyKey(key: any): key is StrategyKey {
    return 'string' === typeof key && key in strategies;
}

export async function determineStrategy(sourceDir: string, options?: { strategy?: string }): Promise<Strategy> {

    if (options?.strategy) {
        if (!isValidStrategyKey(options.strategy)) {
            throw new Error(`Invalid strategy key: ${options.strategy}`);
        }
        if (!await strategies[options.strategy].check(sourceDir)) {
            throw new Error(`Strategy ${options.strategy} not available for source directory ${sourceDir}`);
        }
        return strategies[options.strategy];
    }
    for(let strategyKey of ['files','git','all']) if (isValidStrategyKey(strategyKey)) {
        const strategy = strategies[strategyKey];
        if (await strategy.check(sourceDir)) {
            return strategy;
        }
    }
    throw new Error ("No valid strategy found for source directory " + sourceDir);
}