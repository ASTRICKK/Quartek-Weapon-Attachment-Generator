import React, { useState } from 'react';
import { useStore, CATEGORIES } from './store';
import type { WeaponState, AttachmentConfig } from './store';
import { generateJson } from './generator';

// --- Constants ---
const STATES: WeaponState[] = ['default', 'scope', 'reload', 'sprint'];

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



            {/* Optic Checkbox for Sights */}
            {
                item.categoryId === 'sight' && (
                    <div style={{ marginBottom: '10px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '14px', color: '#ffd700' }}>
                            <input
                                type="checkbox"
                                checked={!!item.isOptic}
                                onChange={e => update(item.id, { isOptic: e.target.checked })}
                            />
                            Is Scope/Optic? (Uses specific optic base model)
                        </label>
                    </div>
                )
            }

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
        </div >
    );
};

const FileUpload = ({ onLoaded }: { onLoaded: (data: any) => void }) => {
    const [status, setStatus] = useState<string>('');

    const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;
        setStatus('Loading...');

        const r = new FileReader();
        r.onload = ev => {
            try {
                const json = JSON.parse(ev.target?.result as string);
                const count = json?.model?.entries?.length || 0;
                onLoaded(json);
                setStatus(`✅ Loaded: ${f.name} (${(f.size / 1024 / 1024).toFixed(2)} MB) - ${count.toLocaleString()} Entries`);
            } catch (err) {
                setStatus('❌ Error: Invalid JSON File');
                console.error(err);
            }
        };
        r.readAsText(f);
    };
    return (
        <div className="card">
            <h3>Upload Existing JSON (To Setup Multi-Gun)</h3>
            <input type="file" onChange={onChange} accept=".json" />
            {status && <p style={{ marginTop: '8px', fontWeight: 'bold' }}>{status}</p>}
        </div>
    );
};

// --- Main App ---

export default function App() {
    const store = useStore();
    const [existingJson, setExistingJson] = useState<any>(null);
    const [minify, setMinify] = useState(false);

    const handleDownload = () => {
        try {
            console.log("Generating with Offsets:", store.offsets);
            console.log("Existing JSON Entries:", existingJson?.model?.entries?.length);

            const result = generateJson(
                store.baseId,
                store.basePaths,
                store.basePathsSight,
                store.basePathsOptic,
                store.offsets,
                store.attachments,
                CATEGORIES,
                existingJson
            );

            console.log("Result Entries:", result.model.entries.length);

            const jsonString = minify ? JSON.stringify(result) : JSON.stringify(result, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
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

                <div className="grid-2">
                    <div className="input-group">
                        <label>Weapon Folder Name</label>
                        <input
                            type="text"
                            value={store.weaponFolderName}
                            onChange={e => store.setPathConfig(e.target.value, store.weaponName)}
                            placeholder="e.g. m4a1"
                        />
                    </div>
                    <div className="input-group">
                        <label>Weapon Name</label>
                        <input
                            type="text"
                            value={store.weaponName}
                            onChange={e => store.setPathConfig(store.weaponFolderName, e.target.value)}
                            placeholder="e.g. m4a1"
                        />
                    </div>
                </div>

                <div className="input-group">
                    <label>Base CustomModelData ID</label>
                    <input
                        type="number"
                        value={store.baseId}
                        onChange={e => store.setBaseId(Number(e.target.value))}
                    />
                    <small style={{ color: '#aaa', display: 'block', marginTop: '4px' }}>
                        *Standard Mode: Start <strong>100</strong>, Step <strong>100</strong> (100, 200... 900). Supports 10 Sights (Stable).
                    </small>
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

                <h3>Base Model Paths (With Sight)</h3>
                <div className="grid-1">
                    {STATES.map(state => (
                        <div key={state}>
                            <label>{state} Path (Sight)</label>
                            <input
                                type="text"
                                value={store.basePathsSight[state]}
                                onChange={e => store.setBasePathSight(state, e.target.value)}
                            />
                        </div>
                    ))}
                </div>

                <h3>Optic Scope Path (Override)</h3>
                <div style={{ marginBottom: '10px' }}>
                    <small style={{ color: '#aaa' }}>
                        *This path is used ONLY when the weapon is in SCOPE state. Default/Reload/Sprint states will fallback to the "With Sight" path.
                    </small>
                </div>
                <div className="grid-1">
                    <div>
                        <label>Scope Path (Optic Specific)</label>
                        <input
                            type="text"
                            value={store.basePathsOptic.scope}
                            onChange={e => store.setBasePathOptic('scope', e.target.value)}
                            placeholder="item/w/..._op_sc_overlay"
                        />
                    </div>
                </div>
            </div>

            {/* Categories Section */}
            {CATEGORIES.map(cat => {
                const items = store.attachments.filter(a => a.categoryId === cat.id);
                const hasItems = items.length > 0;
                // Strict limit from stored config (default to 999 if simpler)
                // We added 'limit' to the Category type in store.ts
                const limit = (cat as any).limit || 999;
                const isFull = items.length >= limit;

                return (
                    <div key={cat.id} className="card">
                        <div className="flex-row-between" style={{ alignItems: 'flex-start' }}>
                            <div>
                                <h2>{cat.label} <small>({cat.range})</small></h2>
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

                            <div className="flex-row" style={{ gap: '10px' }}>
                                {cat.id === 'sight' && (
                                    <>
                                        <button
                                            className="btn"
                                            onClick={() => {
                                                const presets = store.categoryPresets[cat.id] || [];
                                                const blob = new Blob([JSON.stringify(presets, null, 2)], { type: 'application/json' });
                                                const url = URL.createObjectURL(blob);
                                                const a = document.createElement('a');
                                                a.href = url;
                                                a.download = `presets_${cat.id}.json`;
                                                document.body.appendChild(a);
                                                a.click();
                                                document.body.removeChild(a);
                                            }}
                                            title="Download Name Sequence"
                                        >
                                            Download Form
                                        </button>
                                        <label className="btn" style={{ cursor: 'pointer' }} title="Upload Name Sequence">
                                            Upload Form
                                            <input
                                                type="file"
                                                accept=".json"
                                                style={{ display: 'none' }}
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (!file) return;
                                                    const reader = new FileReader();
                                                    reader.onload = (ev) => {
                                                        try {
                                                            const json = JSON.parse(ev.target?.result as string);
                                                            if (Array.isArray(json)) {
                                                                store.setCategoryPreset(cat.id, json);
                                                                alert(`Loaded ${json.length} names for ${cat.label}`);
                                                            } else {
                                                                alert('Invalid format: Expected array of strings.');
                                                            }
                                                        } catch (err) {
                                                            alert('Error parsing JSON');
                                                        }
                                                    };
                                                    reader.readAsText(file);
                                                    // Reset input
                                                    e.target.value = '';
                                                }}
                                            />
                                        </label>
                                    </>
                                )}

                                <button
                                    onClick={() => store.addAttachment(cat.id)}
                                    disabled={isFull}
                                    style={{ opacity: isFull ? 0.5 : 1, cursor: isFull ? 'not-allowed' : 'pointer' }}
                                >
                                    {isFull ? 'Max Capacity' : '+ Add Item'}
                                </button>
                            </div>
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

            <div className="footer" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                        type="checkbox"
                        checked={minify}
                        onChange={e => setMinify(e.target.checked)}
                    />
                    Minify Output (Reduce File Size)
                </label>
                <button className="btn-primary btn-large" onClick={handleDownload}>
                    GENERATE JSON
                </button>
            </div>
        </div>
    );
}
