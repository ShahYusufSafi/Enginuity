// CoordinateDisplay.js
class CoordinateDisplay {
    constructor(engine) {
        this.engine = engine;
        this.display = document.createElement('div');
        this.display.style.cssText = `
            position: fixed;
            bottom: 10px;
            right: 10px;
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 10px;
            font-family: monospace;
            border-radius: 4px;
            min-width: 200px;
        `;
        document.body.appendChild(this.display);
        
        this.setupMouseTracking();
    }
    
    setupMouseTracking() {
        const canvas = this.engine.renderer.domElement;
        
        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            const worldPos = this.engine.screenToWorld(
                e.clientX - rect.left,
                e.clientY - rect.top
            );
            
            const snapped = this.engine.snapToGrid(worldPos);
            
            this.display.innerHTML = `
                <div>Cursor: ${worldPos.x.toFixed(2)}, ${worldPos.y.toFixed(2)}</div>
                <div>Snapped: ${snapped.x}, ${snapped.y}</div>
                <div>Units: ${this.engine.coordinateSystem.units}</div>
                <div>Mode: ${this.engine.coordinateSystem.currentMode}</div>
            `;
        });
        
        // Click to pick coordinates
        canvas.addEventListener('click', (e) => {
            const rect = canvas.getBoundingClientRect();
            const worldPos = this.engine.screenToWorld(
                e.clientX - rect.left,
                e.clientY - rect.top
            );
            
            const snapped = this.engine.snapToGrid(worldPos);
            
            // Show picked coordinate in command line
            const cmdInput = document.getElementById('cad-command-line');
            cmdInput.value = `${snapped.x},${snapped.y}`;
            cmdInput.focus();
            
            // Visual feedback
            this.createPointMarker(snapped);
        });
    }
    
    createPointMarker(point) {
        const geometry = new THREE.CircleGeometry(3, 16);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0xff0000,
            transparent: true,
            opacity: 0.7
        });
        
        const marker = new THREE.Mesh(geometry, material);
        marker.position.set(point.x, point.y, 1); // Slightly above grid
        this.engine.scene.add(marker);
        
        // Remove after 2 seconds
        setTimeout(() => {
            this.engine.scene.remove(marker);
            geometry.dispose();
            material.dispose();
        }, 2000);
    }
}