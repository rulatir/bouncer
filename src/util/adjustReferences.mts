import path from "node:path";
import fs from "node:fs/promises";
import { YAML } from "zx";

function rebasePath(from: string, to: string, specifier: string): string {
    return path.isAbsolute(specifier)
        ? specifier
        : path.relative(to, path.resolve(from, specifier));
}

// Common helper to handle path rebasing with protocol support
function handlePathWithProtocol(from: string, to: string, pathStr: string): string {

    const parts = pathStr.split(":");
    switch(parts.length) {
        case 1:
            return rebasePath(from, to, pathStr);
        case 2:
            return parts[0] === "file"
                ? `file:${rebasePath(from, to, parts[1])}`
                : pathStr;
        default:
            return pathStr;
    }
}

function K(from: string, to: string, [key, value]: [string, any]): [string, any] {
    return [handlePathWithProtocol(from, to, key), value];
}

function P(from: string, to: string, [key, value]: [string, any]): [string, any] {
    return [key, handlePathWithProtocol(from, to, value)];
}

const lockRules = {
    specifiers: {
        "*": P
    },
    dependencies: {
        "*": P,
    },
    packages: {
        "*": [
            K,
            {
                resolution: {
                    directory: P
                }
            }
        ]
    }
}

const packageJsonRules = {
    dependencies: {
        "*": P
    },
    devDependencies: {
        "*": P
    }
}

function processRules(data: any, rules: any, from: string, to: string): any {
    if (!data || typeof data !== 'object') {
        return data;
    }

    // First, expand wildcard rules into an array of entries
    const expandedRules: [string, any][] = [];

    for (const [ruleKey, rule] of Object.entries(rules)) {
        if (ruleKey === '*') {
            // For wildcard rules, create a rule entry for each key in data
            for (const key of Object.keys(data)) {
                expandedRules.push([key, rule]);
            }
        } else {
            // Non-wildcard rules are kept as is
            expandedRules.push([ruleKey, rule]);
        }
    }

    // Process with expanded rules (no wildcards)
    for (const [key, rule] of expandedRules) {
        if (!(key in data)) continue;

        const value = data[key];

        if (typeof rule === 'function') {
            // Apply transformation function to key-value pair
            const [newKey, newValue] = rule(from, to, [key, value]);

            if (newKey !== key) {
                delete data[key];
                data[newKey] = newValue;
            } else {
                data[key] = newValue;
            }
        } else if (Array.isArray(rule)) {
            // First element is a transform function, rest are nested rules
            const [transform, ...nestedRules] = rule;
            let [newKey, newValue] = transform(from, to, [key, value]);

            // Apply any nested rules to the value
            for (const nestedRule of nestedRules) {
                if (typeof newValue === 'object') {
                    newValue = processRules(newValue, nestedRule, from, to);
                }
            }

            if (newKey !== key) {
                delete data[key];
                data[newKey] = newValue;
            } else {
                data[key] = newValue;
            }
        } else if (typeof rule === 'object' && typeof value === 'object' && !Array.isArray(value)) {
            // Apply nested rules to object
            processRules(value, rule, from, to);
        } else if (Array.isArray(value)) {
            // Process each item in the array
            for (let i = 0; i < value.length; i++) {
                value[i] = processRules(value[i], rule, from, to);
            }
        }
    }

    return data;
}

export async function adjustLockFile(srcAbs: string, destAbs: string): Promise<void> {
    const srcLockfile = path.join(srcAbs, 'pnpm-lock.yaml');
    const destLockfile = path.join(destAbs, 'pnpm-lock.yaml');

    let yml = "";
    try {
        yml = await fs.readFile(srcLockfile, 'utf8');
    }
    catch (error) {
        console.warn(`⚠️ Source lockfile not found: ${srcLockfile}`);
        return;
    }

    const data = YAML.parse(yml);

    processRules(data, lockRules, srcAbs, destAbs);

    yml = YAML.stringify(data);
    await fs.writeFile(destLockfile, yml, 'utf8');

    console.log(`🔗 Lockfile adjusted from ${srcLockfile} to ${destLockfile}`);
}

export async function adjustPackageJson(srcAbs: string, destAbs: string): Promise<void> {
    const srcPackageJson = path.join(srcAbs, 'package.json');
    const destPackageJson = path.join(destAbs, 'package.json');

    let pkgJson = "";
    try {
        pkgJson = await fs.readFile(srcPackageJson, 'utf8');
    } catch (error) {
        console.warn(`⚠️ Source package.json not found: ${srcPackageJson}`);
        return;
    }

    const data = JSON.parse(pkgJson);

    processRules(data, packageJsonRules, srcAbs, destAbs);

    pkgJson = JSON.stringify(data, null, 2);
    await fs.writeFile(destPackageJson, pkgJson, 'utf8');

    console.log(`📦 package.json adjusted from ${srcPackageJson} to ${destPackageJson}`);
}

export async function adjustReferences(srcAbs: string, destAbs: string): Promise<void> {
    await adjustLockFile(srcAbs, destAbs);
    await adjustPackageJson(srcAbs, destAbs);
}

