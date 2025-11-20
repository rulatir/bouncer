export default function mergeInto(target: any, patch: any) {
    if (!patch || typeof patch !== 'object') return;
    for (const key of Object.keys(patch)) {
        const pv = patch[key];
        if (pv && typeof pv === 'object' && !Array.isArray(pv)) {
            if (!target || typeof target !== 'object' || Array.isArray(target)) {
                target[key] = {};
            }
            mergeInto(target[key], pv);
        } else {
            target[key] = pv;
        }
    }
}
