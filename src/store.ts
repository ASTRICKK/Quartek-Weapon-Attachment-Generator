
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
    basePaths: Record<WeaponState, string>;

    // State Offsets (e.g. Scope=+1000)
    offsets: Record<WeaponState, number>;

    // Attachments List (Flat list for simplicity, filtered by category in UI)
    attachments: AttachmentConfig[];

    // Actions
    setBaseId: (val: number) => void;
    setBasePath: (state: WeaponState, path: string) => void;
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

const INITIAL_BASE_PATHS: Record<WeaponState, string> = {
    default: 'minecraft:item/eft/m4a1/weapons/default',
    scope: 'minecraft:item/eft/m4a1/weapons/scope',
    reload: 'minecraft:item/eft/m4a1/weapons/reload',
    sprint: 'minecraft:item/eft/m4a1/weapons/sprint'
};

// --- Store ---

export const useStore = create<GeneratorStore>((set) => ({
    baseId: 440,
    basePaths: { ...INITIAL_BASE_PATHS },
    offsets: { ...INITIAL_OFFSETS },
    attachments: [],

    setBaseId: (val) => set({ baseId: val }),

    setBasePath: (state, path) => set((s) => ({
        basePaths: { ...s.basePaths, [state]: path }
    })),

    setOffset: (state, val) => set((s) => ({
        offsets: { ...s.offsets, [state]: val }
    })),

    addAttachment: (categoryId) => set((s) => {
        const newAttachment: AttachmentConfig = {
            id: crypto.randomUUID(),
            categoryId,
            name: 'New Item',
            addValue: 0,
            paths: {
                default: '',
                scope: '',
                reload: '',
                sprint: ''
            }
        };
        return { attachments: [...s.attachments, newAttachment] };
    }),

    removeAttachment: (id) => set((s) => ({
        attachments: s.attachments.filter(a => a.id !== id)
    })),

    updateAttachment: (id, updates) => set((s) => ({
        attachments: s.attachments.map(a =>
            a.id === id ? { ...a, ...updates } : a
        )
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
