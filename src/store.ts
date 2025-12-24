
import { create } from 'zustand';

// --- Types ---

export type WeaponState = 'default' | 'scope' | 'reload' | 'sprint';

export interface AttachmentConfig {
    id: string; // Unique ID
    categoryId: string; // 'sight', 'magazine', etc.
    name: string;
    addValue: number;
    isOptic?: boolean; // New Flag for Sights
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
    basePathsOptic: Record<WeaponState, string>; // New State
    categoryPresets: Record<string, string[]>;

    // State Offsets (e.g. Scope=+1000)
    offsets: Record<WeaponState, number>;

    // Attachments List (Flat list for simplicity, filtered by category in UI)
    attachments: AttachmentConfig[];

    // Actions
    setBaseId: (val: number) => void;
    setPathConfig: (folderName: string, weaponName: string) => void;
    setCategoryPreset: (categoryId: string, names: string[]) => void;
    setBasePath: (state: WeaponState, path: string) => void;
    setBasePathSight: (state: WeaponState, path: string) => void;
    setBasePathOptic: (state: WeaponState, path: string) => void; // New Action
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
    '1', '2', '3', '4', '5',
    '6', '7', '8', '9', '10'
];

const INITIAL_GRIP_PRESETS = [
    '1', '2', '3', '4', '5', '6'
];

const INITIAL_STOCK_PRESETS = [
    '0', 'a1', 'a2', 'a3', 'b1', 'b2', 'b3'
];

const INITIAL_MAGAZINE_PRESETS = [
    '30', '30f', '100'
];

const INITIAL_LASER_PRESETS = [
    'g', 'b', 'r'
];

// Start with empty to force generation from defaults, or set explicitly
const INITIAL_BASE = {
    folder: 'm4a1',
    name: 'm4a1'
};

const generateBasePaths = (folder: string, name: string): Record<WeaponState, string> => ({
    default: `item/w/${folder}/${name}_d`,
    scope: `item/w/${folder}/${name}_sc`,
    reload: `item/w/${folder}/${name}_r`,
    sprint: `item/w/${folder}/${name}_sp`
});

const generateBasePathsSight = (folder: string, name: string): Record<WeaponState, string> => ({
    default: `item/w/${folder}/${name}_si_d`,
    scope: `item/w/${folder}/${name}_si_sc`,
    reload: `item/w/${folder}/${name}_si_r`,
    sprint: `item/w/${folder}/${name}_si_sp`
});

const generateBasePathsOptic = (folder: string, name: string): Record<WeaponState, string> => ({
    default: `item/w/${folder}/${name}_op_d`,
    scope: `item/w/${folder}/${name}_op_sc`,
    reload: `item/w/${folder}/${name}_op_r`,
    sprint: `item/w/${folder}/${name}_op_sp`
});

// --- Store ---

export const useStore = create<GeneratorStore>((set) => ({
    baseId: 440,
    weaponFolderName: INITIAL_BASE.folder,
    weaponName: INITIAL_BASE.name,
    basePaths: generateBasePaths(INITIAL_BASE.folder, INITIAL_BASE.name),
    basePathsSight: generateBasePathsSight(INITIAL_BASE.folder, INITIAL_BASE.name),
    basePathsOptic: generateBasePathsOptic(INITIAL_BASE.folder, INITIAL_BASE.name), // Init
    categoryPresets: {
        sight: INITIAL_SIGHT_PRESETS,
        grip: INITIAL_GRIP_PRESETS,
        stock: INITIAL_STOCK_PRESETS,
        magazine: INITIAL_MAGAZINE_PRESETS,
        laser: INITIAL_LASER_PRESETS
    },
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
        const newBasePathsOptic = generateBasePathsOptic(folder, name);

        // Regenerate All Attachment Paths
        const newAttachments = s.attachments.map(a => {
            const categoryId = a.categoryId;
            const categoryFolder = SECTION_FOLDERS[categoryId] || categoryId;
            const cleanName = a.name.replace(/\s+/g, '_');

            return {
                ...a,
                paths: {
                    default: `item/w/${folder}/${categoryFolder}/${cleanName}_d`,
                    scope: `item/w/${folder}/${categoryFolder}/${cleanName}_sc`,
                    reload: `item/w/${folder}/${categoryFolder}/${cleanName}_r`,
                    sprint: `item/w/${folder}/${categoryFolder}/${cleanName}_sp`
                }
            };
        });

        return {
            weaponFolderName: folder,
            weaponName: name,
            basePaths: newBasePaths,
            basePathsSight: newBasePathsSight,
            basePathsOptic: newBasePathsOptic,
            attachments: newAttachments
        };
    }),

    setBasePath: (state, path) => set((s) => ({
        basePaths: { ...s.basePaths, [state]: path }
    })),

    setBasePathSight: (state, path) => set((s) => ({
        basePathsSight: { ...s.basePathsSight, [state]: path }
    })),

    setBasePathOptic: (state, path) => set((s) => ({
        basePathsOptic: { ...s.basePathsOptic, [state]: path }
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

        // Special Case: Laser appends weapon name (e.g. g -> g_m4a1)
        if (categoryId === 'laser' && s.weaponName) {
            name = `${name}_${s.weaponName}`;
        }

        // Special Case: Suppressor uses Weapon Name by default
        if (categoryId === 'suppressor' && s.weaponName) {
            name = s.weaponName;
        }

        const cleanName = name.replace(/\s+/g, '_');

        const newAttachment: AttachmentConfig = {
            id: crypto.randomUUID(),
            categoryId,
            name,
            addValue: nextValue,
            paths: {
                default: `item/w/${weaponFolder}/${folder}/${cleanName}_d`,
                scope: `item/w/${weaponFolder}/${folder}/${cleanName}_sc`,
                reload: `item/w/${weaponFolder}/${folder}/${cleanName}_r`,
                sprint: `item/w/${weaponFolder}/${folder}/${cleanName}_sp`
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
                    default: `item/w/${weaponFolder}/${folder}/${cleanName}_d`,
                    scope: `item/w/${weaponFolder}/${folder}/${cleanName}_sc`,
                    reload: `item/w/${weaponFolder}/${folder}/${cleanName}_r`,
                    sprint: `item/w/${weaponFolder}/${folder}/${cleanName}_sp`
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
    sight: 'si',
    suppressor: 'su',
    laser: 'l',
    stock: 'st',
    magazine: 'm',
    grip: 'g',
    mount: 'mo' // mounts -> mo
};

export const CATEGORIES = [
    { id: 'sight', label: 'Sights / Scope', step: 100_000_000, fmtStep: '100,000,000', range: '100M - 1B', max: '1,000,000,000', support: '10 Items (Precision Safe limit)', limit: 10 },
    { id: 'laser', label: 'Laser', step: 10_000_000, fmtStep: '10,000,000', range: '10M - 90M', max: '90,000,000', support: '9 Items', limit: 9 },
    { id: 'stock', label: 'Stock', step: 1_000_000, fmtStep: '1,000,000', range: '1M - 9M - (Less than 4 is recommended)', max: '9,000,000', support: '9 Items', limit: 9 },
    { id: 'grip', label: 'Grip', step: 100_000, fmtStep: '100,000', range: '100k - 900k', max: '900,000', support: '9 Items', limit: 9 },
    { id: 'magazine', label: 'Magazine', step: 10_000, fmtStep: '10,000', range: '10k - 90k', max: '90,000', support: '9 Items', limit: 9 },
    { id: 'suppressor', label: 'Suppressor', step: 5_000, fmtStep: '5,000', range: '+5,000', max: '5,000', support: '1 Item (Fixed)', limit: 1 },
];
