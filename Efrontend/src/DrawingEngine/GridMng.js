import * as THREE from 'three';

// src/core/GridManager.js
class GridManager {
    constructor(scene) {
        this.scene = scene;
        this.gridSize = 10; // Distance between grid lines
        this.majorGridSize = 50; // Every 5th line is major
        this.gridColor = 0xCCCCCC;
        this.majorGridColor = 0x888888;
        this.gridOpacity = 0.5;
        this.isVisible = true;
        this.gridLines = [];
        this.axesLines = [];
        
        this.createGrid();
        this.createAxes();
    }
    
    createGrid() {
        const gridExtent = 10000; // How far grid extends in each direction
        const lineCount = gridExtent / this.gridSize;
        
        // Create minor grid lines
        for (let i = -lineCount; i <= lineCount; i++) {
            const isMajor = i % (this.majorGridSize / this.gridSize) === 0;
            const color = isMajor ? this.majorGridColor : this.gridColor;
            const lineWidth = isMajor ? 2 : 1;
            
            // Horizontal lines
            const hGeometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(-gridExtent, i * this.gridSize, 0),
                new THREE.Vector3(gridExtent, i * this.gridSize, 0)
            ]);
            const hMaterial = new THREE.LineBasicMaterial({ 
                color: color,
                opacity: this.gridOpacity,
                transparent: true,
                linewidth: lineWidth
            });
            const hLine = new THREE.Line(hGeometry, hMaterial);
            this.scene.add(hLine);
            this.gridLines.push(hLine);
            
            // Vertical lines
            const vGeometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(i * this.gridSize, -gridExtent, 0),
                new THREE.Vector3(i * this.gridSize, gridExtent, 0)
            ]);
            const vMaterial = new THREE.LineBasicMaterial({ 
                color: color,
                opacity: this.gridOpacity,
                transparent: true,
                linewidth: lineWidth
            });
            const vLine = new THREE.Line(vGeometry, vMaterial);
            this.scene.add(vLine);
            this.gridLines.push(vLine);
        }
    }
    
    createAxes() {
        const axesLength = 10000;
        
        // X-axis (red)
        const xGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(-axesLength, 0, 0.1), // Slightly above grid
            new THREE.Vector3(axesLength, 0, 0.1)
        ]);
        const xMaterial = new THREE.LineBasicMaterial({ 
            color: 0xFF0000,
            linewidth: 3
        });
        const xAxis = new THREE.Line(xGeometry, xMaterial);
        this.scene.add(xAxis);
        this.axesLines.push(xAxis);
        
        // Y-axis (green)
        const yGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, -axesLength, 0.1),
            new THREE.Vector3(0, axesLength, 0.1)
        ]);
        const yMaterial = new THREE.LineBasicMaterial({ 
            color: 0x00FF00,
            linewidth: 3
        });
        const yAxis = new THREE.Line(yGeometry, yMaterial);
        this.scene.add(yAxis);
        this.axesLines.push(yAxis);
        
        // Origin point
        const originGeometry = new THREE.CircleGeometry(2, 16);
        const originMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x0000FF 
        });
        const origin = new THREE.Mesh(originGeometry, originMaterial);
        origin.position.set(0, 0, 0.2);
        this.scene.add(origin);
        this.axesLines.push(origin);
    }
    
    setGridSize(size) {
        this.gridSize = size;
        this.updateGrid();
    }
    
    setVisibility(visible) {
        this.isVisible = visible;
        this.gridLines.forEach(line => {
            line.visible = visible;
        });
        this.axesLines.forEach(line => {
            line.visible = visible;
        });
    }
    
    updateGrid() {
        // Remove old grid
        this.gridLines.forEach(line => {
            this.scene.remove(line);
            line.geometry.dispose();
            line.material.dispose();
        });
        this.gridLines = [];
        
        // Create new grid
        this.createGrid();
    }
    
    getSnappedPoint(worldPoint) {
        return {
            x: Math.round(worldPoint.x / this.gridSize) * this.gridSize,
            y: Math.round(worldPoint.y / this.gridSize) * this.gridSize,
            z: 0
        };
    }
}

export { GridManager };