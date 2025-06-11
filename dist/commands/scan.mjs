import { determineStrategy } from "../strategy/index.mjs";
export async function scan(destinationDir) {
    const strategy = await determineStrategy(destinationDir);
    await strategy.performScan(destinationDir);
}
