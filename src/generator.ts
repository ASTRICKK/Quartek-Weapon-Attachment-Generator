
import type { AttachmentConfig, WeaponState } from './store';

// --- Types for JSON Output ---

interface JsonModelEntry {
    threshold: number;
    model: {
        type: string;
        models: Array<{ type: string; model: string }>;
    };
}

interface OutputJson {
    hand_animation_on_swap: boolean;
    model: {
        type: string;
        property: string;
        fallback: { type: string; model: string };
        entries: JsonModelEntry[];
    };
}

// --- Generator Logic ---

export function generateJson(
    baseId: number,
    basePaths: Record<WeaponState, string>,
    basePathsSight: Record<WeaponState, string>,
    basePathsOptic: Record<WeaponState, string>, // New Argument
    offsets: Record<WeaponState, number>,
    attachments: AttachmentConfig[],
    categories: Array<{ id: string; label: string }>,
    existingJson: any
): OutputJson {

    // 1. Group Attachments by Category
    const categoryGroups = categories.map(cat => {
        const catItems = attachments.filter(a => a.categoryId === cat.id);

        // Always include "None" option
        const noneOption = { addValue: 0, paths: null, id: 'none', categoryId: cat.id, isOptic: false };

        // Map items to options
        const otherOptions = catItems.map(item => ({
            addValue: item.addValue,
            paths: item.paths,
            id: item.id,
            categoryId: item.categoryId,
            isOptic: item.isOptic // Carry over flag
        }));

        return [noneOption, ...otherOptions];
    });

    // 2. Cartesian Product
    const combinations = categoryGroups.reduce((a, b) => {
        return a.flatMap(x => b.map(y => [...x, y]));
    }, [[]] as any[][]);

    // 3. Build Entries
    const newEntries: JsonModelEntry[] = [];
    const states: WeaponState[] = ['default', 'scope', 'reload', 'sprint'];

    combinations.forEach(combo => {
        // combo is an array of selected options
        const totalAdd = combo.reduce((sum, item) => sum + item.addValue, 0);

        // CHECK: Does this combo have a sight / optic?
        const hasSight = combo.some(item => item.categoryId === 'sight' && item.id !== 'none');
        const hasOptic = combo.some(item => item.isOptic === true && item.id !== 'none');

        // Select the correct base paths
        // Priority Logic:
        // 1. If Optic: Use Optic Scope for 'scope', otherwise use Sight paths for default/reload/sprint
        // 2. If Sight: Use Sight paths for all
        // 3. Else: Use Base paths

        // For each state
        states.forEach(state => {
            const offset = offsets[state];
            const finalThreshold = baseId + totalAdd + offset;

            let basePath = basePaths[state] || '';

            if (hasOptic) {
                if (state === 'scope') {
                    basePath = basePathsOptic.scope || '';
                } else {
                    basePath = basePathsSight[state] || '';
                }
            } else if (hasSight) {
                basePath = basePathsSight[state] || '';
            }

            if (isNaN(finalThreshold)) {
                console.error(`NaN Threshold detected! State: ${state}, Base: ${baseId}, TotalAdd: ${totalAdd}, Offset: ${offset}`);
            }

            // Build Model List
            // 1. Base Weapon (Context Aware)
            const models = [
                { type: 'model', model: basePath }
            ];

            // 2. Attachments
            combo.forEach(item => {
                if (item.paths && item.paths[state]) {
                    models.push({
                        type: 'model',
                        model: item.paths[state]
                    });
                }
            });

            newEntries.push({
                threshold: finalThreshold,
                model: {
                    type: 'composite',
                    models: models
                }
            });
        });
    });

    // 4. Merge
    let finalEntries = newEntries;
    let fallback = { type: 'model', model: 'item/eft/loots/aabattery' };

    if (existingJson?.model?.entries) {
        if (existingJson.model.fallback) fallback = existingJson.model.fallback;

        const map = new Map<number, JsonModelEntry>();
        existingJson.model.entries.forEach((e: any) => map.set(e.threshold, e));
        console.log(`[DEBUG] Map Size after Existing Load: ${map.size}`);

        // Log sample existing
        if (map.size > 0) console.log('[DEBUG] Existing Sample:', existingJson.model.entries[0]);

        newEntries.forEach(e => map.set(e.threshold, e));
        console.log(`[DEBUG] Map Size after New Merge: ${map.size}`);
        console.log(`[DEBUG] New Entries Generated: ${newEntries.length}`);
        if (newEntries.length > 0) console.log('[DEBUG] New Entry Sample (Default):', newEntries[0]);
        if (newEntries.length > 1) console.log('[DEBUG] New Entry Sample (Scope):', newEntries[1]);

        finalEntries = Array.from(map.values());
    }

    // 5. Sort
    finalEntries.sort((a, b) => a.threshold - b.threshold);

    return {
        hand_animation_on_swap: false,
        model: {
            type: 'range_dispatch',
            property: 'custom_model_data',
            fallback,
            entries: finalEntries
        }
    };
}
