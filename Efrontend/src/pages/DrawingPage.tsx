import '../styles/DrawingEngine.css';

// @ts-ignore
import  DrawingEngine  from '../DrawingEngine/DrawEngine.js';
// @ts-ignore

import  DrawingTools  from '../DrawingEngine/Tools.js';
import { useEffect } from 'react';

import CoordinateDisplay from '../hooks/CoordinateDisplay';


export default function DrawingPage() {

    // since we have external non-react code, we need to use useEffect to initialize it after the component mounts
     useEffect(() => {
        // Initialize Drawing Engine
        const drwEngine = new DrawingEngine('cad-container');

        // Initialize Drawing Tools
        const drawingTools = new DrawingTools(drwEngine);
        drwEngine.drawingTools = drawingTools;

        // Initialize Coordinate Display
        const coordDisplay = new CoordinateDisplay(drwEngine);
        drwEngine.coordinateDisplay = coordDisplay;

        // OPTIONAL: wire engine → display
        drwEngine.onMouseMove = (worldPos: any) => {
            coordDisplay.updatePosition(worldPos);
        };

        console.log('Web CAD System initialized');

        // Cleanup on unmount
        return () => {
            // cleanup if needed
            drwEngine.dispose?.();
        };
    }, []);

    return (
    <div className="drawingPage">
        {/* Main Toolbar */}    
        <div id="toolbar">
            <div className="tool-group">
                <label>Selection</label>
                <button className="tool-btn active" data-tool="select">Select</button>
            </div>
            
            <div className="tool-group">
                <label>Drawing</label>
                <button className="tool-btn" data-tool="line">Line</button>
                <button className="tool-btn" data-tool="circle">Circle</button>
                <button className="tool-btn" data-tool="rectangle">Rectangle</button>
                <button className="tool-btn" data-tool="point">Point</button>
                <button className="tool-btn" data-tool="polyline">Polyline</button>
            </div>
            
            <div className="tool-group">
                <label>Editing</label>
                <button className="tool-btn" data-tool="move">Move</button>
                <button className="tool-btn" data-tool="rotate">Rotate</button>
                <button className="tool-btn" data-tool="scale">Scale</button>
                <button className="tool-btn" data-tool="trim">Trim</button>
                <button className="tool-btn" data-tool="extend">Extend</button>
            </div>
            
            <div className="tool-group">
                <label>Annotation</label>
                <button className="tool-btn" data-tool="dimension">Dimension</button>
                <button className="tool-btn" data-tool="text">Text</button>
                <button className="tool-btn" data-tool="measure">Measure</button>
            </div>
            
            <div className="tool-group">
                <label>Properties</label>
                <input type="color" id="color-picker" defaultValue="#007acc" style={{width: "100%"}} />
                <select id="line-width" style={{width: "100%", marginTop: "5px", padding: "4px"}}>
                    <option value="1">Thin (1px)</option>
                    <option value="2">Normal (2px)</option>
                    <option value="3">Thick (3px)</option>
                    <option value="5">Extra Thick (5px)</option>
                </select>
            </div>
        </div>
        
        {/* Grid Controls */}
        <div className="grid-controls">
            <h4 style={{marginTop: "0", marginBottom: "8px"}}>Grid Controls</h4>
            <label>
                <input type="checkbox" id="grid-toggle" defaultChecked /> Show Grid
            </label>
            <label>
                <input type="checkbox" id="snap-toggle" defaultChecked /> Snap to Grid
            </label>
            <label>
                Grid Size: 
                <select id="grid-size" defaultValue="10">
                    <option value="1">1 mm</option>
                    <option value="5">5 mm</option>
                    <option value="10">10 mm</option>
                    <option value="25">25 mm</option>
                    <option value="50">50 mm</option>
                    <option value="100">100 mm</option>
                </select>
            </label>
        </div>
        
        {/* Units Display */}
        <div className="units-display">
            Units: <select id="unit-select" style={{background: "#333", color: "white", border: "none"}}>
                <option value="mm">Millimeters</option>
                <option value="cm">Centimeters</option>
                <option value="m">Meters</option>
                <option value="inches">Inches</option>
            </select>
        </div>
        
        {/* Status Bar */}
        <div className="status-bar" id="status-bar">
            <div className="status-item">X: 0.00 Y: 0.00 Z: 0.00</div>
            <div className="status-item">Mode: Absolute</div>
            <div className="status-item">Snap: ON</div>
            <div className="status-item">Grid: 10 mm</div>
        </div>
        
        {/* Command History (toggle with F2) */}
        <div id="command-history">
            <div>Command History:</div>
        </div>
        
        {/* Main CAD Container */}
        <div id="cad-container"></div>
    </div>
);
}