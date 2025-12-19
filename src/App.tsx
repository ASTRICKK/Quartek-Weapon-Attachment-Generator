
import React, { useState } from 'react';
import { useStore } from './store';
import type { WeaponState, AttachmentConfig } from './store';
import { generateJson } from './generator';

// --- Constants ---
const STATES: WeaponState[] = ['default', 'scope', 'reload', 'sprint'];

const CATEGORIES = [
    { id: 'sight', label: 'Sights / Scope', step: 1_000_000, fmtStep: '1,000,000', range: '1M - 20M', max: '20,000,000', support: '20 Items' },
    { id: 'suppressor', label: 'Suppressor', step: 100_000_000, fmtStep: '100,000,000', range: '100M', max: '100,000,000', support: '1 Item (On/Off)' },
    { id: 'laser', label: 'Laser', step: 200_000_000, fmtStep: '200,000,000', range: '200M - 600M', max: '600,000,000', support: '3 Items' },
    { id: 'stock', label: 'Stock', step: 25_000_000, fmtStep: '25,000,000', range: '25M - 75M', max: '75,000,000', support: '3 Items' },
    { id: 'magazine', label: 'Magazine', step: 10_000, fmtStep: '10,000', range: '10k - 20k', max: '20,000', support: '2 Items' },
    { id: 'grip', label: 'Grip', step: 100_000, fmtStep: '100,000', range: '100k - 300k', max: '300,000', support: '3 Items' },
];

// --- Sub-Components ---

const AttachmentRow = ({ item, onDelete }: { item: AttachmentConfig; onDelete: () => void }) => {
    const update = useStore(s => s.updateAttachment);
    const updatePath = useStore(s => s.updateAttachmentPath);

    return (
        <div className="attachment-row">
            <div className="flex-between">
                <strong>{item.name}</strong>
                <button className="btn-danger" onClick={onDelete}>Remove</button>
            </div>

            <div className="grid-2">
                <div>
                    <label>Name</label>
                    <input
                        type="text"
                        value={item.name}
                        onChange={e => update(item.id, { name: e.target.value })}
                    />
                </div>
                <div>
                    <label>ADD Value</label>
                    <input
                        type="number"
                        value={item.addValue}
                        onChange={e => update(item.id, { addValue: Number(e.target.value) })}
                    />
                </div>
            </div>

            <div className="path-grid">
                {STATES.map(state => (
                    <div key={state}>
                        <label className="text-small">{state}</label>
                        <input
                            type="text"
                            value={item.paths[state]}
                            onChange={e => updatePath(item.id, state as WeaponState, e.target.value)}
                            placeholder={`Path (${state})`}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};

const FileUpload = ({ onLoaded }: { onLoaded: (data: any) => void }) => {
    const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;
        const r = new FileReader();
        r.onload = ev => {
            try {
                onLoaded(JSON.parse(ev.target?.result as string));
            } catch { alert('Invalid JSON'); }
        };
        r.readAsText(f);
    };
    return (
        <div className="card">
            <h3>Upload Existing JSON (Optional)</h3>
            <input type="file" onChange={onChange} accept=".json" />
        </div>
    );
};

// --- Main App ---

export default function App() {
    const store = useStore();
    const [existingJson, setExistingJson] = useState<any>(null);

    const handleDownload = () => {
        try {
            const result = generateJson(
                store.baseId,
                store.basePaths,
                store.offsets,
                store.attachments,
                CATEGORIES,
                existingJson
            );

            const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = existingJson ? 'updated_model.json' : `weapon_${store.baseId}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } catch (err) {
            console.error(err);
            alert('Error generating JSON. Check console.');
        }
    };

    return (
        <div className="container">
            <h1>Weapon Attachment Generator</h1>

            <FileUpload onLoaded={setExistingJson} />

            {/* Base Config Section */}
            <div className="card">
                <h2>Base Weapon Configuration</h2>
                <div className="input-group">
                    <label>Base CustomModelData ID</label>
                    <input
                        type="number"
                        value={store.baseId}
                        onChange={e => store.setBaseId(Number(e.target.value))}
                    />
                </div>

                <h3>State Offsets (ADD)</h3>
                <div className="grid-2">
                    {STATES.filter(s => s !== 'default').map(state => (
                        <div key={state}>
                            <label>{state.toUpperCase()} Offset</label>
                            <input
                                type="number"
                                value={store.offsets[state]}
                                onChange={e => store.setOffset(state, Number(e.target.value))}
                            />
                        </div>
                    ))}
                </div>

                <h3>Base Model Paths</h3>
                <div className="grid-1">
                    {STATES.map(state => (
                        <div key={state}>
                            <label>{state} Path</label>
                            <input
                                type="text"
                                value={store.basePaths[state]}
                                onChange={e => store.setBasePath(state, e.target.value)}
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* Categories Section */}
            {CATEGORIES.map(cat => {
                const items = store.attachments.filter(a => a.categoryId === cat.id);
                const hasItems = items.length > 0;

                return (
                    <div key={cat.id} className="card">
                        <div className="flex-between" style={{ alignItems: 'flex-start' }}>
                            <div>
                                <h3>{cat.label}</h3>
                                <div className="info-grid">
                                    <div className="info-item">
                                        <span className="label">Step (ADD)</span>
                                        <span className="value code">{cat.fmtStep}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="label">Range</span>
                                        <span className="value">{cat.range}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="label">Max Value</span>
                                        <span className="value">{cat.max}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="label">Capacity</span>
                                        <span className="value">{cat.support}</span>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => store.addAttachment(cat.id)}>+ Add Item</button>
                        </div>

                        {hasItems ? (
                            <div className="item-list">
                                {items.map(item => (
                                    <AttachmentRow
                                        key={item.id}
                                        item={item}
                                        onDelete={() => store.removeAttachment(item.id)}
                                    />
                                ))}
                            </div>
                        ) : (
                            <p className="text-muted">No attachments in this category.</p>
                        )}
                    </div>
                );
            })}

            <div className="footer">
                <button className="btn-primary btn-large" onClick={handleDownload}>
                    GENERATE JSON
                </button>
            </div>
        </div>
    );
}
