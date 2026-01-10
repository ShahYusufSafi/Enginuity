// src/core/SelectionManager.js
class SelectionManager {
    constructor() {
        this.selectedEntities = [];
        this.selectionColor = 0xFFA500; // Orange for selection
        this.originalMaterials = new Map();
        this.selectionBoxes = [];
    }
    
    select(entity) {
        if (!this.selectedEntities.includes(entity)) {
            this.selectedEntities.push(entity);
            this.highlightEntity(entity);
        }
    }
    
    deselect(entity) {
        const index = this.selectedEntities.indexOf(entity);
        if (index > -1) {
            this.selectedEntities.splice(index, 1);
            this.removeHighlight(entity);
        }
    }
    
    selectAll(entities) {
        entities.forEach(entity => this.select(entity));
    }
    
    deselectAll() {
        this.selectedEntities.forEach(entity => this.removeHighlight(entity));
        this.selectedEntities = [];
        this.originalMaterials.clear();
    }
    
    highlightEntity(entity) {
        // Store original material
        if (!this.originalMaterials.has(entity.object)) {
            this.originalMaterials.set(entity.object, entity.object.material);
        }
        
        // Apply selection material
        const selectionMaterial = new THREE.LineBasicMaterial({
            color: this.selectionColor,
            linewidth: 3
        });
        
        entity.object.material = selectionMaterial;
        
        // Add selection box for non-line entities
        if (entity.type !== 'line') {
            this.addSelectionBox(entity);
        }
    }
    
    removeHighlight(entity) {
        const originalMaterial = this.originalMaterials.get(entity.object);
        if (originalMaterial) {
            entity.object.material = originalMaterial;
            this.originalMaterials.delete(entity.object);
        }
        
        // Remove selection box
        this.removeSelectionBox(entity);
    }
    
    addSelectionBox(entity) {
        const box = new THREE.BoxHelper(entity.object, this.selectionColor);
        entity.object.parent.add(box);
        this.selectionBoxes.push({ entity, box });
    }
    
    removeSelectionBox(entity) {
        const index = this.selectionBoxes.findIndex(item => item.entity === entity);
        if (index > -1) {
            const { box } = this.selectionBoxes[index];
            box.parent.remove(box);
            box.geometry.dispose();
            box.material.dispose();
            this.selectionBoxes.splice(index, 1);
        }
    }
    
    getSelectedEntities() {
        return [...this.selectedEntities];
    }
    
    hasSelection() {
        return this.selectedEntities.length > 0;
    }
    
    // Move selected entities
    moveSelected(deltaX, deltaY) {
        this.selectedEntities.forEach(entity => {
            entity.object.position.x += deltaX;
            entity.object.position.y += deltaY;
            
            // Update entity data
            if (entity.start) entity.start.x += deltaX;
            if (entity.start) entity.start.y += deltaY;
            if (entity.end) entity.end.x += deltaX;
            if (entity.end) entity.end.y += deltaY;
            if (entity.center) entity.center.x += deltaX;
            if (entity.center) entity.center.y += deltaY;
        });
    }
}

export {SelectionManager};