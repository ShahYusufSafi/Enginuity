// src/tools/DrawingTools.js - Complete version
import * as THREE from 'three';

export default class DrawingTools {
    constructor(engine) {
        this.engine = engine;
        this.activeTool = 'select';
        this.isDrawing = false;
        this.currentEntity = null;
        this.previewObject = null;
        this.startPoint = null;
        
        // Setup command line if not already exists
        this.setupCommandLine();
    }
    
    setupCommandLine() {
        if (!document.getElementById('cad-command-line')) {
            const input = document.createElement('input');
            input.type = 'text';
            input.id = 'cad-command-line';
            input.style.cssText = `
                position: fixed;
                bottom: 10px;
                left: 50%;
                transform: translateX(-50%);
                width: 400px;
                padding: 10px;
                font-family: monospace;
                background: rgba(0,0,0,0.9);
                color: #0f0;
                border: 1px solid #0f0;
                border-radius: 4px;
                z-index: 1000;
            `;
            input.placeholder = 'Enter coordinates (100,200), relative (@50,100), or polar (@100<45)';
            document.body.appendChild(input);
            
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.processCommand(input.value);
                    input.value = '';
                }
            });
        }
    }
    
    processCommand(command) {
        try {
            const point = this.engine.coordinateSystem.parseInput(command);
            
            switch(this.activeTool) {
                case 'line':
                    this.handleLineCommand(point);
                    break;
                case 'circle':
                    this.handleCircleCommand(point);
                    break;
                case 'rectangle':
                    this.handleRectangleCommand(point);
                    break;
                case 'point':
                    this.createPointEntity(point);
                    break;
                case 'measure':
                    this.measureDistance(point);
                    break;
                default:
                    console.log(`Command for ${this.activeTool}: ${command}`);
            }
        } catch (error) {
            console.error('Command error:', error);
        }
    }
    
    onMouseDown(e, worldPos) {
        switch(this.activeTool) {
            case 'select':
                this.handleSelect(e, worldPos);
                break;
            case 'line':
                this.startLine(worldPos);
                break;
            case 'circle':
                this.startCircle(worldPos);
                break;
            case 'rectangle':
                this.startRectangle(worldPos);
                break;
            case 'point':
                this.createPointEntity(worldPos);
                break;
            case 'measure':
                this.startMeasurement(worldPos);
                break;
        }
    }
    
    onMouseMove(e, worldPos) {
        switch(this.activeTool) {
            case 'line':
                this.updateLinePreview(worldPos);
                break;
            case 'circle':
                this.updateCirclePreview(worldPos);
                break;
            case 'rectangle':
                this.updateRectanglePreview(worldPos);
                break;
            case 'measure':
                this.updateMeasurementPreview(worldPos);
                break;
        }
    }
    
    onMouseUp(e, worldPos) {
        switch(this.activeTool) {
            case 'line':
                this.finishLine(worldPos);
                break;
            case 'circle':
                this.finishCircle(worldPos);
                break;
            case 'rectangle':
                this.finishRectangle(worldPos);
                break;
            case 'measure':
                this.finishMeasurement(worldPos);
                break;
        }
    }
    
    // LINE TOOL
    startLine(point) {
        this.startPoint = point;
        this.isDrawing = true;
        this.currentEntity = {
            type: 'line',
            start: { ...point },
            end: { ...point }
        };
        this.createLinePreview(point, point);
    }
    
    updateLinePreview(point) {
        if (this.isDrawing && this.previewObject) {
            const geometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(this.startPoint.x, this.startPoint.y, 1),
                new THREE.Vector3(point.x, point.y, 1)
            ]);
            this.previewObject.geometry.dispose();
            this.previewObject.geometry = geometry;
        }
    }
    
    finishLine(point) {
        if (this.isDrawing && this.startPoint) {
            const line = this.createLineEntity(this.startPoint, point);
            this.engine.addEntity(line);
            
            // Clean up preview
            if (this.previewObject) {
                this.engine.scene.remove(this.previewObject);
                this.previewObject.geometry.dispose();
                this.previewObject.material.dispose();
                this.previewObject = null;
            }
            
            this.isDrawing = false;
            this.startPoint = null;
            this.currentEntity = null;
        }
    }
    
    handleLineCommand(point) {
        if (!this.isDrawing) {
            this.startLine(point);
        } else {
            this.finishLine(point);
            this.startLine(point); // Continue from last point
        }
    }
    
    createLineEntity(start, end) {
        const geometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(start.x, start.y, 0),
            new THREE.Vector3(end.x, end.y, 0)
        ]);
        
        const material = new THREE.LineBasicMaterial({ 
            color: this.getCurrentColor(),
            linewidth: 2
        });
        
        const lineObject = new THREE.Line(geometry, material);
        
        return {
            type: 'line',
            object: lineObject,
            start: { ...start },
            end: { ...end }
        };
    }
    
    createLinePreview(start, end) {
        const geometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(start.x, start.y, 1),
            new THREE.Vector3(end.x, end.y, 1)
        ]);
        
        const material = new THREE.LineDashedMaterial({ 
            color: 0x0000FF,
            linewidth: 2,
            dashSize: 5,
            gapSize: 5
        });
        
        this.previewObject = new THREE.Line(geometry, material);
        this.previewObject.computeLineDistances();
        this.engine.scene.add(this.previewObject);
    }
    
    // CIRCLE TOOL
    startCircle(center) {
        this.startPoint = center;
        this.isDrawing = true;
        this.currentEntity = {
            type: 'circle',
            center: { ...center },
            radius: 0
        };
        this.createCirclePreview(center, 0);
    }
    
    updateCirclePreview(point) {
        if (this.isDrawing && this.previewObject && this.startPoint) {
            const dx = point.x - this.startPoint.x;
            const dy = point.y - this.startPoint.y;
            const radius = Math.sqrt(dx*dx + dy*dy);
            
            this.previewObject.geometry.dispose();
            this.previewObject.geometry = new THREE.CircleGeometry(radius, 32);
            this.previewObject.position.set(this.startPoint.x, this.startPoint.y, 1);
        }
    }
    
    finishCircle(point) {
        if (this.isDrawing && this.startPoint) {
            const dx = point.x - this.startPoint.x;
            const dy = point.y - this.startPoint.y;
            const radius = Math.sqrt(dx*dx + dy*dy);
            
            const circle = this.createCircleEntity(this.startPoint, radius);
            this.engine.addEntity(circle);
            
            // Clean up preview
            if (this.previewObject) {
                this.engine.scene.remove(this.previewObject);
                this.previewObject.geometry.dispose();
                this.previewObject.material.dispose();
                this.previewObject = null;
            }
            
            this.isDrawing = false;
            this.startPoint = null;
            this.currentEntity = null;
        }
    }
    
    handleCircleCommand(point) {
        if (!this.isDrawing) {
            this.startCircle(point);
        } else {
            // For circle, we need center and radius
            // Second point determines radius
            this.finishCircle(point);
        }
    }
    
    createCircleEntity(center, radius) {
        const geometry = new THREE.CircleGeometry(radius, 32);
        const material = new THREE.MeshBasicMaterial({ 
            color: this.getCurrentColor(),
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide
        });
        
        const circleObject = new THREE.Mesh(geometry, material);
        circleObject.position.set(center.x, center.y, 0);
        
        return {
            type: 'circle',
            object: circleObject,
            center: { ...center },
            radius: radius
        };
    }
    
    createCirclePreview(center, radius) {
        const geometry = new THREE.CircleGeometry(radius, 32);
        const material = new THREE.LineBasicMaterial({ 
            color: 0x0000FF,
            transparent: true,
            opacity: 0.7
        });
        
        this.previewObject = new THREE.Line(geometry, material);
        this.previewObject.position.set(center.x, center.y, 1);
        this.engine.scene.add(this.previewObject);
    }
    
    // Other tools implementations would continue similarly...
    // Rectangle tool, measurement tool, etc.
    
    getCurrentColor() {
        const colorPicker = document.getElementById('color-picker');
        return colorPicker ? parseInt(colorPicker.value.replace('#', '0x')) : 0x0000FF;
    }
    
    // SELECTION TOOL
    handleSelect(e, worldPos) {
        // Simple selection: just log for now
        console.log('Select at:', worldPos.x.toFixed(2), worldPos.y.toFixed(2));

        // In a real implementation, you would:
        // 1. Raycast to find objects at this position
        // 2. Select/deselect entities
        // 3. Update selection highlights
    }

    // Cancel any in-progress drawing operation
    cancelCurrentOperation() {
        if (this.previewObject) {
            this.engine.scene.remove(this.previewObject);
            this.previewObject.geometry?.dispose();
            this.previewObject.material?.dispose();
            this.previewObject = null;
        }
        this.isDrawing     = false;
        this.startPoint    = null;
        this.currentEntity = null;
    }

    // Switch the active tool — called by React toolbar buttons
    setActiveTool(tool) {
        if (this.isDrawing) this.cancelCurrentOperation();
        this.activeTool = tool;
        console.log('[Tools] Active tool: ' + tool);
    }
}
