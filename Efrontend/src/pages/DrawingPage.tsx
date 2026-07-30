/**
 * DrawingPage — three.js CAD prototype.
 *
 * @deprecated Superseded by /import. Frozen: fix what's here, add nothing.
 * Enginuity is not becoming a CAD editor.
 *
 * The toolbar only offers Select, Line and Circle because those are the only
 * tools DrawingEngine/Tools.js implements. Its switch statements dispatch
 * rectangle, point and measure to methods that were never defined, which
 * throws on the first canvas click — don't re-add those buttons without
 * writing the handlers.
 *
 * Two DOM couplings to know about before editing:
 * - Tools.getCurrentColor() reads `#color-picker` by id, so the colour input
 *   must keep that id.
 * - CoordinateDisplay.updatePosition() overwrites `#status-bar`'s innerHTML on
 *   the first mouse move, so nothing static can live inside that element.
 */

import '../styles/DrawingEngine.css';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

// @ts-expect-error — vanilla JS engine, no type declarations
import DrawingEngine from '../DrawingEngine/DrawEngine.js';
// @ts-expect-error — vanilla JS engine, no type declarations
import DrawingTools from '../DrawingEngine/Tools.js';
// @ts-expect-error — vanilla JS engine, no type declarations
import { SVGImporter } from '../DrawingEngine/SVGImporter.js';
import CoordinateDisplay from '../hooks/CoordinateDisplay';

/** Only tools that DrawingEngine/Tools.js actually implements. */
const TOOL_GROUPS = [
    {
        label: 'Selection',
        tools: [{ id: 'select', label: 'Select' }],
    },
    {
        label: 'Drawing',
        tools: [
            { id: 'line',   label: 'Line'   },
            { id: 'circle', label: 'Circle' },
        ],
    },
] as const;

/**
 * Tools the sidebar used to offer that the engine cannot perform. Listed so
 * the removal is documented rather than mysterious; re-add a button here only
 * once the matching methods exist in Tools.js.
 */
const UNIMPLEMENTED_TOOLS = [
    'rectangle', 'point', 'measure',            // dispatched, methods undefined
    'polyline', 'move', 'rotate', 'scale',      // no dispatch case at all
    'trim', 'extend', 'dimension', 'text',
] as const;
void UNIMPLEMENTED_TOOLS;

const UNIT_OPTIONS = [
    { value: 'mm',     label: 'Millimeters' },
    { value: 'cm',     label: 'Centimeters' },
    { value: 'm',      label: 'Meters'      },
    { value: 'inches', label: 'Inches'      },
] as const;

const GRID_SIZES = [1, 5, 10, 25, 50, 100] as const;

export default function DrawingPage() {
    const engineRef    = useRef<any>(null);
    const importerRef  = useRef<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [activeTool, setActiveTool] = useState('select');
    const [importing,  setImporting]  = useState(false);
    const [importMsg,  setImportMsg]  = useState<string | null>(null);

    const [showGrid,  setShowGrid]  = useState(true);
    const [snap,      setSnap]      = useState(true);
    const [gridSize,  setGridSize]  = useState(10);
    const [units,     setUnits]     = useState<string>('mm');

    // ── Init engine on mount ────────────────────────────────────────────────
    useEffect(() => {
        const drwEngine    = new DrawingEngine('cad-container');
        const drawingTools = new DrawingTools(drwEngine);
        drwEngine.drawingTools = drawingTools;

        const coordDisplay = new CoordinateDisplay(drwEngine);
        drwEngine.coordinateDisplay = coordDisplay;

        importerRef.current = new SVGImporter(drwEngine);
        engineRef.current   = drwEngine;

        return () => {
            drwEngine.dispose?.();
            engineRef.current   = null;
            importerRef.current = null;
        };
    }, []);

    // ── Controls → engine (declarative, no getElementById) ──────────────────
    useEffect(() => { engineRef.current?.gridManager?.setVisibility(showGrid); }, [showGrid]);
    useEffect(() => { if (engineRef.current) engineRef.current.snapEnabled = snap; }, [snap]);
    useEffect(() => { engineRef.current?.gridManager?.setGridSize(gridSize); }, [gridSize]);
    useEffect(() => { engineRef.current?.coordinateSystem?.setUnits(units); }, [units]);

    const handleToolChange = (toolId: string) => {
        setActiveTool(toolId);
        engineRef.current?.drawingTools?.setActiveTool(toolId);
    };

    const handleFitView = () => engineRef.current?.fitAll();

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = '';           // reset so the same file can be re-picked

        setImporting(true);
        setImportMsg(null);
        try {
            await importerRef.current?.importFromFile(file);
            setImportMsg(`✓ Loaded: ${file.name}`);
        } catch (err: any) {
            setImportMsg(`✗ Error: ${err?.message ?? 'unknown'}`);
            console.error('[DrawingPage] SVG import failed:', err);
        } finally {
            setImporting(false);
            setTimeout(() => setImportMsg(null), 4000);
        }
    };

    return (
        <div className="drawingPage">

            {/* ── Deprecation banner ──────────────────────────────────────── */}
            <div style={{
                position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
                background: '#78350f', color: '#fde68a',
                padding: '6px 12px', fontSize: 12, textAlign: 'center',
            }}>
                Prototype (frozen) — three.js sketch canvas with Line and Circle only.
                The supported path for real drawings is{' '}
                <Link to="/import" style={{ color: '#fff', textDecoration: 'underline' }}>
                    Import
                </Link>
                : DXF/DWG → canonical model, with layers, selection and measurement.
            </div>

            {/* ── Left sidebar toolbar ────────────────────────────────────── */}
            <div id="toolbar" style={{ top: 40 }}>

                {TOOL_GROUPS.map(group => (
                    <div key={group.label} className="tool-group">
                        <label>{group.label}</label>
                        {group.tools.map(t => (
                            <button
                                key={t.id}
                                type="button"
                                className={`tool-btn${activeTool === t.id ? ' active' : ''}`}
                                onClick={() => handleToolChange(t.id)}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                ))}

                {/* Properties — colour is read by Tools.getCurrentColor() via this id */}
                <div className="tool-group">
                    <label htmlFor="color-picker">Colour</label>
                    <input
                        type="color"
                        id="color-picker"
                        defaultValue="#007acc"
                        style={{ width: '100%' }}
                        title="Colour of newly drawn entities"
                    />
                </div>

                {/* File / view */}
                <div className="tool-group">
                    <label>File</label>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".svg"
                        style={{ display: 'none' }}
                        onChange={handleFileChange}
                    />

                    <button
                        type="button"
                        className="tool-btn"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={importing}
                        title="Open an SVG file in the CAD canvas"
                    >
                        {importing ? 'Loading…' : '⬆ Open SVG'}
                    </button>

                    <button
                        type="button"
                        className="tool-btn"
                        onClick={handleFitView}
                        title="Fit all geometry into view (keyboard: F)"
                    >
                        ⊡ Fit View
                    </button>

                    <button
                        type="button"
                        className="tool-btn"
                        onClick={() => engineRef.current?.exportImage()}
                        title="Export the current view as a PNG"
                    >
                        ↓ Export PNG
                    </button>
                </div>

                {importMsg && (
                    <div style={{
                        marginTop: 6,
                        padding: '6px 8px',
                        borderRadius: 4,
                        background: importMsg.startsWith('✓') ? '#1a3a1a' : '#3a1a1a',
                        color: importMsg.startsWith('✓') ? '#6f6' : '#f66',
                        fontSize: 11,
                        wordBreak: 'break-all',
                    }}>
                        {importMsg}
                    </div>
                )}
            </div>

            {/* ── Units ───────────────────────────────────────────────────── */}
            <div className="units-display" style={{ top: 40 }}>
                <label htmlFor="unit-select">Units:&nbsp;</label>
                <select
                    id="unit-select"
                    value={units}
                    onChange={(e) => setUnits(e.target.value)}
                    style={{ background: '#333', color: 'white', border: 'none' }}
                >
                    {UNIT_OPTIONS.map(u => (
                        <option key={u.value} value={u.value}>{u.label}</option>
                    ))}
                </select>
            </div>

            {/* ── Grid controls ───────────────────────────────────────────── */}
            <div className="grid-controls">
                <h4 style={{ marginTop: 0, marginBottom: 8 }}>Grid Controls</h4>
                <label>
                    <input
                        type="checkbox"
                        checked={showGrid}
                        onChange={(e) => setShowGrid(e.target.checked)}
                    /> Show Grid <span style={{ opacity: 0.6 }}>(G)</span>
                </label>
                <label>
                    <input
                        type="checkbox"
                        checked={snap}
                        onChange={(e) => setSnap(e.target.checked)}
                    /> Snap to Grid <span style={{ opacity: 0.6 }}>(S)</span>
                </label>
                <label htmlFor="grid-size">
                    Grid Size:{' '}
                    <select
                        id="grid-size"
                        value={gridSize}
                        onChange={(e) => setGridSize(Number(e.target.value))}
                    >
                        {GRID_SIZES.map(s => (
                            <option key={s} value={s}>{s} {units}</option>
                        ))}
                    </select>
                </label>
            </div>

            {/* Live readout — CoordinateDisplay replaces this element's contents */}
            <div className="status-bar" id="status-bar">
                <div className="status-item">X: 0.00 Y: 0.00</div>
            </div>

            {/* Static hints, kept out of #status-bar so they survive the overwrite */}
            <div
                className="status-bar"
                style={{ bottom: 130, color: '#9ca3af', borderLeftColor: '#9ca3af' }}
            >
                <div className="status-item">Tool: {activeTool}</div>
                <div className="status-item">Middle/Right-drag: pan · Scroll: zoom</div>
                <div className="status-item">F: fit view · G: grid · S: snap · Esc: cancel</div>
            </div>

            {/* three.js canvas target */}
            <div id="cad-container" />
        </div>
    );
}
