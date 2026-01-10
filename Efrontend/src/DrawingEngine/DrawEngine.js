import * as THREE from 'three';
import { CoordinateSystem } from './CrdSys.js';
import { GridManager } from './GridMng.js';
import { SelectionManager } from './selectionManager.js';

// src/core/CADEngine.js - Complete version
export default class DrawingEngine {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        
        // Initialize Three.js
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf0f0f0);
        
        // Orthographic camera for 2D CAD
        const aspect = window.innerWidth / window.innerHeight;
        const frustumSize = 1000;
        this.camera = new THREE.OrthographicCamera(
            frustumSize * aspect / -2,
            frustumSize * aspect / 2,
            frustumSize / 2,
            frustumSize / -2,
            0.1,
            10000
        );
        this.camera.position.z = 10;
        this.camera.lookAt(0, 0, 0);
        
        // Renderer
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            preserveDrawingBuffer: true // For export
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.container.appendChild(this.renderer.domElement);
        
        // Core systems
        this.coordinateSystem = new CoordinateSystem();
        this.gridManager = new GridManager(this.scene);
        this.selectionManager = new SelectionManager();
        this.drawingTools = null; // Will be set later
        this.coordinateDisplay = null; // Will be set later
        
        // State
        this.entities = [];
        this.snapEnabled = true;
        this.currentMousePosition = new THREE.Vector3();
        this.isDragging = false;
        this.dragStart = new THREE.Vector3();
        
        // Initialize
        this.setupEventListeners();
        this.animate();
        
        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());
    }
    
    setupEventListeners() {
        const canvas = this.renderer.domElement;
        
        canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
        canvas.addEventListener('wheel', (e) => this.onMouseWheel(e));
        canvas.addEventListener('dblclick', (e) => this.onDoubleClick(e));
        
        // Keyboard events
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
        document.addEventListener('keyup', (e) => this.onKeyUp(e));
    }
    
    screenToWorld(screenX, screenY) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        const x = ((screenX - rect.left) / rect.width) * 2 - 1;
        const y = -((screenY - rect.top) / rect.height) * 2 + 1;
        
        const vector = new THREE.Vector3(x, y, 0);
        vector.unproject(this.camera);
        
        return vector;
    }
    
    worldToScreen(worldPoint) {
        const vector = worldPoint.clone();
        vector.project(this.camera);
        
        const x = (vector.x + 1) / 2 * window.innerWidth;
        const y = (-vector.y + 1) / 2 * window.innerHeight;
        
        return { x, y };
    }
    
    getSnappedPosition(screenX, screenY) {
        const worldPos = this.screenToWorld(screenX, screenY);
        
        if (this.snapEnabled) {
            return this.gridManager.getSnappedPoint(worldPos);
        }
        
        return worldPos;
    }
    
    onMouseDown(e) {
        const worldPos = this.getSnappedPosition(e.clientX, e.clientY);
        this.currentMousePosition.copy(worldPos);
        this.dragStart.copy(worldPos);
        this.isDragging = true;
        
        // Pass to active tool
        if (this.drawingTools) {
            this.drawingTools.onMouseDown(e, worldPos);
        }
    }
    
    onMouseMove(e) {
        const worldPos = this.getSnappedPosition(e.clientX, e.clientY);
        this.currentMousePosition.copy(worldPos);
        
        // Update coordinate display
        if (this.coordinateDisplay) {
            this.coordinateDisplay.updatePosition(worldPos);
        }
        
        // Pass to active tool
        if (this.drawingTools) {
            this.drawingTools.onMouseMove(e, worldPos);
        }
    }
    
    onMouseUp(e) {
        const worldPos = this.getSnappedPosition(e.clientX, e.clientY);
        this.isDragging = false;
        
        // Pass to active tool
        if (this.drawingTools) {
            this.drawingTools.onMouseUp(e, worldPos);
        }
    }
    
    onMouseWheel(e) {
        e.preventDefault();
        
        const zoomFactor = 0.1;
        const worldPos = this.screenToWorld(e.clientX, e.clientY);
        
        if (e.deltaY < 0) {
            // Zoom in
            this.camera.zoom *= (1 + zoomFactor);
        } else {
            // Zoom out
            this.camera.zoom *= (1 - zoomFactor);
        }
        
        // Clamp zoom
        this.camera.zoom = Math.max(0.1, Math.min(100, this.camera.zoom));
        this.camera.updateProjectionMatrix();
    }
    
    onDoubleClick(e) {
        const worldPos = this.getSnappedPosition(e.clientX, e.clientY);
        
        // Create a point marker
        this.createPointMarker(worldPos);
        
        // Update command line with coordinates
        const cmdInput = document.getElementById('cad-command-line');
        if (cmdInput) {
            cmdInput.value = `${worldPos.x.toFixed(2)},${worldPos.y.toFixed(2)}`;
            cmdInput.focus();
        }
    }
    
    onKeyDown(e) {
        // Toggle snap with S key
        if (e.key === 's' || e.key === 'S') {
            this.snapEnabled = !this.snapEnabled;
            console.log(`Snap to grid: ${this.snapEnabled ? 'ON' : 'OFF'}`);
        }
        
        // Toggle grid with G key
        if (e.key === 'g' || e.key === 'G') {
            this.gridManager.setVisibility(!this.gridManager.isVisible);
        }
        
        // Pan with arrow keys
        const panSpeed = 10;
        switch(e.key) {
            case 'ArrowLeft':
                this.camera.position.x -= panSpeed;
                break;
            case 'ArrowRight':
                this.camera.position.x += panSpeed;
                break;
            case 'ArrowUp':
                this.camera.position.y += panSpeed;
                break;
            case 'ArrowDown':
                this.camera.position.y -= panSpeed;
                break;
        }
        
        this.camera.updateProjectionMatrix();
    }
    
    onKeyUp(e) {
        // Handle key releases if needed
    }
    
    createPointMarker(position) {
        const geometry = new THREE.CircleGeometry(3, 16);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0xFF0000,
            transparent: true,
            opacity: 0.7
        });
        
        const marker = new THREE.Mesh(geometry, material);
        marker.position.copy(position);
        marker.position.z = 5; // Above other objects
        this.scene.add(marker);
        
        // Remove after 3 seconds
        setTimeout(() => {
            this.scene.remove(marker);
            geometry.dispose();
            material.dispose();
        }, 3000);
    }
    
    addEntity(entity) {
        this.entities.push(entity);
        this.scene.add(entity.object);
    }
    
    removeEntity(entity) {
        const index = this.entities.indexOf(entity);
        if (index > -1) {
            this.entities.splice(index, 1);
            this.scene.remove(entity.object);
            
            // Clean up Three.js resources
            entity.object.geometry.dispose();
            entity.object.material.dispose();
        }
    }
    
    clearAll() {
        this.entities.forEach(entity => {
            this.scene.remove(entity.object);
            entity.object.geometry.dispose();
            entity.object.material.dispose();
        });
        this.entities = [];
    }
    
    onWindowResize() {
        const aspect = window.innerWidth / window.innerHeight;
        const frustumSize = this.camera.top - this.camera.bottom;
        
        this.camera.left = -frustumSize * aspect / 2;
        this.camera.right = frustumSize * aspect / 2;
        this.camera.top = frustumSize / 2;
        this.camera.bottom = -frustumSize / 2;
        
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        this.renderer.render(this.scene, this.camera);
    }
    
    // Export current view as image
    exportImage() {
        const dataURL = this.renderer.domElement.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = dataURL;
        link.download = 'cad-drawing.png';
        link.click();
    }
}