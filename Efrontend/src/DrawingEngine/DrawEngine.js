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

        // Pan state (middle-mouse drag)
        this.isPanning   = false;
        this.panLastX    = 0;
        this.panLastY    = 0;

        // Keep bound references so we can remove them in dispose()
        this._onResize   = () => this.onWindowResize();
        this._onKeyDown  = (e) => this.onKeyDown(e);
        this._onKeyUp    = (e) => this.onKeyUp(e);

        // Initialize
        this.setupEventListeners();
        this.animate();

        // Handle window resize
        window.addEventListener('resize', this._onResize);
    }
    
    setupEventListeners() {
        const canvas = this.renderer.domElement;
        
        canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
        canvas.addEventListener('wheel', (e) => this.onMouseWheel(e));
        canvas.addEventListener('dblclick', (e) => this.onDoubleClick(e));
        
        // Prevent context menu on right-click (we use right-click for pan)
        canvas.addEventListener('contextmenu', (e) => e.preventDefault());

        // Keyboard events
        document.addEventListener('keydown', this._onKeyDown);
        document.addEventListener('keyup',   this._onKeyUp);
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
        // Middle mouse (button 1) or right mouse (button 2) → start pan
        if (e.button === 1 || e.button === 2) {
            this.isPanning = true;
            this.panLastX  = e.clientX;
            this.panLastY  = e.clientY;
            this.renderer.domElement.style.cursor = 'grabbing';
            return;
        }

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
        // Pan: move camera in world space
        if (this.isPanning) {
            const dx = e.clientX - this.panLastX;
            const dy = e.clientY - this.panLastY;
            this.panLastX = e.clientX;
            this.panLastY = e.clientY;

            // Convert screen delta → world delta (account for zoom)
            const frustumW = (this.camera.right - this.camera.left) / this.camera.zoom;
            const frustumH = (this.camera.top   - this.camera.bottom) / this.camera.zoom;
            this.camera.position.x -= (dx / window.innerWidth)  * frustumW;
            this.camera.position.y += (dy / window.innerHeight) * frustumH;
            return;
        }

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
        if (e.button === 1 || e.button === 2) {
            this.isPanning = false;
            this.renderer.domElement.style.cursor = 'crosshair';
            return;
        }

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

        // Fit all geometry into view with F key
        if (e.key === 'f' || e.key === 'F') {
            this.fitAll();
        }

        // Escape: cancel current drawing operation
        if (e.key === 'Escape') {
            this.drawingTools?.cancelCurrentOperation?.();
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
        if (this._disposed) return;
        requestAnimationFrame(() => this.animate());
        this.renderer.render(this.scene, this.camera);
    }
    
    // ── Fit camera so that a region of the given size fills ~85 % of the view ──
    fitToView(size) {
        if (!size || size.x === 0 || size.y === 0) return;

        const frustumW = this.camera.right  - this.camera.left;
        const frustumH = this.camera.top    - this.camera.bottom;

        const zoomX = frustumW / (size.x * 1.15);
        const zoomY = frustumH / (size.y * 1.15);

        this.camera.zoom = Math.min(zoomX, zoomY);
        this.camera.position.x = 0;
        this.camera.position.y = 0;
        this.camera.updateProjectionMatrix();
    }

    // ── Fit camera to all entities currently in the scene ───────────────────
    fitAll() {
        if (this.entities.length === 0) return;

        const box = new THREE.Box3();
        this.entities.forEach(e => box.expandByObject(e.object));

        const center = box.getCenter(new THREE.Vector3());
        const size   = box.getSize(new THREE.Vector3());

        this.camera.position.x = center.x;
        this.camera.position.y = center.y;
        this.fitToView(size);
    }

    // Export current view as image
    exportImage() {
        const dataURL = this.renderer.domElement.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = dataURL;
        link.download = 'cad-drawing.png';
        link.click();
    }

    // ── Clean up all Three.js resources and DOM elements ────────────────────
    dispose() {
        this._disposed = true;

        // Remove event listeners
        window.removeEventListener('resize',  this._onResize);
        document.removeEventListener('keydown', this._onKeyDown);
        document.removeEventListener('keyup',   this._onKeyUp);

        // Dispose entities
        this.clearAll();

        // Dispose renderer
        this.renderer.dispose();
        if (this.container && this.renderer.domElement.parentNode === this.container) {
            this.container.removeChild(this.renderer.domElement);
        }
    }
}