
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
    offsets: Record<WeaponState, number>,
    attachments: AttachmentConfig[],
    categories: Array<{ id: string; label: string }>,
    existingJson: any
): OutputJson {

    // 1. Group Attachments by Category
    // We need to form "Options" for each category.
    // Option 1: "None" (Add 0, no model)
    // Option 2..N: The added attachments

    const categoryGroups = categories.map(cat => {
        const catItems = attachments.filter(a => a.categoryId === cat.id);

        // Always include "None" option
        const noneOption = { addValue: 0, paths: null, id: 'none' };

        // Map items to options
        const otherOptions = catItems.map(item => ({
            addValue: item.addValue,
            paths: item.paths,
            id: item.id
        }));

        return [noneOption, ...otherOptions];
    });

    // 2. Cartesian Product
    // [[A,B], [C,D]] => [[A,C], [A,D], [B,C], [B,D]]
    const combinations = categoryGroups.reduce((a, b) => {
        return a.flatMap(x => b.map(y => [...x, y]));
    }, [[]] as any[][]);

    // 3. Build Entries
    const newEntries: JsonModelEntry[] = [];
    const states: WeaponState[] = ['default', 'scope', 'reload', 'sprint'];

    combinations.forEach(combo => {
        // combo is an array of selected options (one from each category)
        const totalAdd = combo.reduce((sum, item) => sum + item.addValue, 0);

        // For each state
        states.forEach(state => {
            const offset = offsets[state];
            const finalThreshold = baseId + totalAdd + offset;

            // Build Model List
            // 1. Base Weapon
            const models = [
                { type: 'minecraft:model', model: basePaths[state] || '' }
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
    // Simple strategy: rebuild the entries list.
    // Ideally, preservation of OTHER thresholds that are NOT in our range is good,
    // but for this specific tool, replacing collisions is the goal.

    let finalEntries = newEntries;
    let fallback = { type: 'model', model: 'item/eft/loots/aabattery' };

    if (existingJson?.model?.entries) {
        if (existingJson.model.fallback) fallback = existingJson.model.fallback;

        const map = new Map<number, JsonModelEntry>();
        // Load existing
        existingJson.model.entries.forEach((e: any) => map.set(e.threshold, e));
        // Overwrite new
        newEntries.forEach(e => map.set(e.threshold, e));

        // Convert back to array
        finalEntries = Array.from(map.values());
    }

    // 5. Sort
    finalEntries.sort((a, b) => a.threshold - b.threshold);

    return {
        model: {
            type: 'range_dispatch',
            property: 'custom_model_data',
            fallback,
            entries: finalEntries
        }
    };
}
