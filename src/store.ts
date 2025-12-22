
import { create } from 'zustand';

// --- Types ---

export type WeaponState = 'default' | 'scope' | 'reload' | 'sprint';

export interface AttachmentConfig {
    id: string; // Unique ID
    categoryId: string; // 'sight', 'magazine', etc.
    name: string;
    addValue: number;
    // Paths for each state (e.g. sight active model, sight reload model)
    paths: Record<WeaponState, string>;
}

export interface GeneratorStore {
    // Base Configuration
    baseId: number;
    weaponFolderName: string;
    weaponName: string;
    basePaths: Record<WeaponState, string>;
    basePathsSight: Record<WeaponState, string>;
    categoryPresets: Record<string, string[]>; // New State

    // State Offsets (e.g. Scope=+1000)
    offsets: Record<WeaponState, number>;

    // Attachments List (Flat list for simplicity, filtered by category in UI)
    attachments: AttachmentConfig[];

    // Actions
    setBaseId: (val: number) => void;
    setPathConfig: (folderName: string, weaponName: string) => void; // New Action
    setCategoryPreset: (categoryId: string, names: string[]) => void; // New Action
    setBasePath: (state: WeaponState, path: string) => void;
    setBasePathSight: (state: WeaponState, path: string) => void;
    setOffset: (state: WeaponState, val: number) => void;

    addAttachment: (categoryId: string) => void;
    removeAttachment: (id: string) => void;
    updateAttachment: (id: string, updates: Partial<AttachmentConfig>) => void;
    updateAttachmentPath: (id: string, state: WeaponState, path: string) => void;
}

// --- Initial Data ---
const INITIAL_OFFSETS: Record<WeaponState, number> = {
    default: 0,
    scope: 1000,
    reload: 2000,
    sprint: 3000
};

const INITIAL_SIGHT_PRESETS = [
    'ekp8', 'hhs1_on', 'vudu', 'xps3', 'hs401g5',
    'hamr_optic', 'okp7', 'srs02', 't1', 'valday'
];

// Start with empty to force generation from defaults, or set explicitly
const INITIAL_BASE = {
    folder: 'm4a1',
    name: 'm4a1'
};

const generateBasePaths = (folder: string, name: string): Record<WeaponState, string> => ({
    default: `minecraft:item/eft/weapons/${folder}/${name}_default`,
    scope: `minecraft:item/eft/weapons/${folder}/${name}_scope`,
    reload: `minecraft:item/eft/weapons/${folder}/${name}_reload`,
    sprint: `minecraft:item/eft/weapons/${folder}/${name}_sprint`
});

const generateBasePathsSight = (folder: string, name: string): Record<WeaponState, string> => ({
    default: `minecraft:item/eft/weapons/${folder}/${name}_sight_default`,
    scope: `minecraft:item/eft/weapons/${folder}/${name}_sight_scope`,
    reload: `minecraft:item/eft/weapons/${folder}/${name}_sight_reload`,
    sprint: `minecraft:item/eft/weapons/${folder}/${name}_sight_sprint`
});

// --- Store ---

export const useStore = create<GeneratorStore>((set) => ({
    baseId: 440,
    weaponFolderName: INITIAL_BASE.folder,
    weaponName: INITIAL_BASE.name,
    basePaths: generateBasePaths(INITIAL_BASE.folder, INITIAL_BASE.name),
    basePathsSight: generateBasePathsSight(INITIAL_BASE.folder, INITIAL_BASE.name),
    categoryPresets: { sight: INITIAL_SIGHT_PRESETS }, // Init
    offsets: { ...INITIAL_OFFSETS },
    attachments: [],

    setBaseId: (val) => set({ baseId: val }),

    setCategoryPreset: (categoryId, names) => set((s) => ({
        categoryPresets: { ...s.categoryPresets, [categoryId]: names }
    })),

    setPathConfig: (folder, name) => set((s) => {
        // Regenerate Base Paths
        const newBasePaths = generateBasePaths(folder, name);
        const newBasePathsSight = generateBasePathsSight(folder, name);

        // Regenerate All Attachment Paths
        const newAttachments = s.attachments.map(a => {
            const categoryId = a.categoryId;
            const categoryFolder = SECTION_FOLDERS[categoryId] || categoryId;
            const cleanName = a.name.replace(/\s+/g, '_');

            return {
                ...a,
                paths: {
                    default: `minecraft:item/eft/weapons/${folder}/${categoryFolder}/${cleanName}_default`,
                    scope: `minecraft:item/eft/weapons/${folder}/${categoryFolder}/${cleanName}_scope`,
                    reload: `minecraft:item/eft/weapons/${folder}/${categoryFolder}/${cleanName}_reload`,
                    sprint: `minecraft:item/eft/weapons/${folder}/${categoryFolder}/${cleanName}_sprint`
                }
            };
        });

        return {
            weaponFolderName: folder,
            weaponName: name,
            basePaths: newBasePaths,
            basePathsSight: newBasePathsSight,
            attachments: newAttachments
        };
    }),

    setBasePath: (state, path) => set((s) => ({
        basePaths: { ...s.basePaths, [state]: path }
    })),

    setBasePathSight: (state, path) => set((s) => ({
        basePathsSight: { ...s.basePathsSight, [state]: path }
    })),

    setOffset: (state, val) => set((s) => ({
        offsets: { ...s.offsets, [state]: val }
    })),

    addAttachment: (categoryId) => set((s) => {
        const category = CATEGORIES.find(c => c.id === categoryId);
        if (!category) return {};

        const existingItems = s.attachments.filter(a => a.categoryId === categoryId);
        if (typeof category.limit === 'number' && existingItems.length >= category.limit) {
            return {}; // Limit reached
        }

        // Find first available slot
        let nextValue = category.step;
        let slotIndex = 0; // 0-based index for presets

        for (let i = 1; i <= (category.limit || 999); i++) {
            const candidate = i * category.step;
            const taken = existingItems.some(a => a.addValue === candidate);
            if (!taken) {
                nextValue = candidate;
                slotIndex = i - 1;
                break;
            }
        }

        const folder = SECTION_FOLDERS[categoryId] || categoryId;
        const weaponFolder = s.weaponFolderName;

        // Name Logic: Preset -> "Item X" fallback
        let name = `Item ${slotIndex + 1}`;
        const presets = s.categoryPresets[categoryId];
        if (presets && presets.length > slotIndex) {
            name = presets[slotIndex];
        }

        const cleanName = name.replace(/\s+/g, '_');

        const newAttachment: AttachmentConfig = {
            id: crypto.randomUUID(),
            categoryId,
            name,
            addValue: nextValue,
            paths: {
                default: `minecraft:item/eft/weapons/${weaponFolder}/${folder}/${cleanName}_default`,
                scope: `minecraft:item/eft/weapons/${weaponFolder}/${folder}/${cleanName}_scope`,
                reload: `minecraft:item/eft/weapons/${weaponFolder}/${folder}/${cleanName}_reload`,
                sprint: `minecraft:item/eft/weapons/${weaponFolder}/${folder}/${cleanName}_sprint`
            }
        };
        return { attachments: [...s.attachments, newAttachment] };
    }),

    removeAttachment: (id) => set((s) => ({
        attachments: s.attachments.filter(a => a.id !== id)
    })),

    updateAttachment: (id, updates) => set((s) => ({
        attachments: s.attachments.map(a => {
            if (a.id !== id) return a;

            const updated = { ...a, ...updates };

            // If name changed, update paths automatically
            if (updates.name) {
                const categoryId = a.categoryId;
                const folder = SECTION_FOLDERS[categoryId] || categoryId;
                const weaponFolder = s.weaponFolderName;
                const cleanName = updates.name.replace(/\s+/g, '_');

                updated.paths = {
                    default: `minecraft:item/eft/weapons/${weaponFolder}/${folder}/${cleanName}_default`,
                    scope: `minecraft:item/eft/weapons/${weaponFolder}/${folder}/${cleanName}_scope`,
                    reload: `minecraft:item/eft/weapons/${weaponFolder}/${folder}/${cleanName}_reload`,
                    sprint: `minecraft:item/eft/weapons/${weaponFolder}/${folder}/${cleanName}_sprint`
                };
            }

            return updated;
        })
    })),

    updateAttachmentPath: (id, state, path) => set((s) => ({
        attachments: s.attachments.map(a =>
            a.id === id ? {
                ...a,
                paths: { ...a.paths, [state]: path }
            } : a
        )
    }))
}));

// --- Constants ---

export const SECTION_FOLDERS: Record<string, string> = {
    sight: 'sights',
    suppressor: 'suppressor',
    laser: 'lasers',
    stock: 'stocks',
    magazine: 'magazines',
    grip: 'grips',
    mount: 'mounts'
};

export const CATEGORIES = [
    { id: 'sight', label: 'Sights / Scope', step: 100_000_000, fmtStep: '100,000,000', range: '100M - 2B', max: '2,000,000,000', support: '20 Items', limit: 20 },
    { id: 'laser', label: 'Laser', step: 10_000_000, fmtStep: '10,000,000', range: '10M - 90M', max: '90,000,000', support: '9 Items', limit: 9 },
    { id: 'suppressor', label: 'Suppressor', step: 5_000_000, fmtStep: '5,000,000', range: '5M', max: '5,000,000', support: '1 Item (Fixed)', limit: 1 },
    { id: 'stock', label: 'Stock', step: 1_000_000, fmtStep: '1,000,000', range: '1M - 4M', max: '4,000,000', support: '4 Items', limit: 4 },
    { id: 'grip', label: 'Grip', step: 100_000, fmtStep: '100,000', range: '100k - 900k', max: '900,000', support: '9 Items', limit: 9 },
    { id: 'magazine', label: 'Magazine', step: 10_000, fmtStep: '10,000', range: '10k - 90k', max: '90,000', support: '9 Items', limit: 9 },
    { id: 'mount', label: 'Mount', step: 5_000, fmtStep: '5,000', range: '5,000', max: '5,000', support: '1 Item (Fixed)', limit: 1 },
];
