import fs from 'node:fs/promises';
import {determineStrategy} from "../strategy/index.mjs";

export async function scan(destinationDir: string) : Promise<void> {
    const strategy = await determineStrategy(destinationDir);
    await strategy.performScan(destinationDir);
}