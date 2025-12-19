
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
    basePathsSight: Record<WeaponState, string>, // New Argument
    offsets: Record<WeaponState, number>,
    attachments: AttachmentConfig[],
    categories: Array<{ id: string; label: string }>,
    existingJson: any
): OutputJson {

    // 1. Group Attachments by Category
    const categoryGroups = categories.map(cat => {
        const catItems = attachments.filter(a => a.categoryId === cat.id);

        // Always include "None" option
        const noneOption = { addValue: 0, paths: null, id: 'none', categoryId: cat.id };

        // Map items to options
        const otherOptions = catItems.map(item => ({
            addValue: item.addValue,
            paths: item.paths,
            id: item.id,
            categoryId: item.categoryId
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

        // CHECK: Does this combo have a sight?
        // We look for any item where categoryId is 'sight' and it's NOT the "none" option (id !== 'none')
        const hasSight = combo.some(item => item.categoryId === 'sight' && item.id !== 'none');

        // Select the correct base paths
        const currentBasePaths = hasSight ? basePathsSight : basePaths;

        // For each state
        states.forEach(state => {
            const offset = offsets[state];
            const finalThreshold = baseId + totalAdd + offset;

            // Build Model List
            // 1. Base Weapon (Context Aware)
            const models = [
                { type: 'minecraft:model', model: currentBasePaths[state] || '' }
            ];

            // 2. Attachments
            combo.forEach(item => {
                if (item.paths && item.paths[state]) {
                    models.push({
                        type: 'minecraft:model',
                        model: item.paths[state]
                    });
                }
            });

            newEntries.push({
                threshold: finalThreshold,
                model: {
                    type: 'minecraft:composite',
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
        newEntries.forEach(e => map.set(e.threshold, e));

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
