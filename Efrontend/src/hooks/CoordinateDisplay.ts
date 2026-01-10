class CoordinateDisplay {
    engine: any;
    statusBar: HTMLElement | null;

    constructor(engine: any) {
        this.engine = engine;
        this.statusBar = document.getElementById('status-bar');
    }

    updatePosition(worldPos: { x: number; y: number }) {
        if (!this.statusBar) return;

        const snapped = this.engine.gridManager.getSnappedPoint(worldPos);

        this.statusBar.innerHTML = `
            <div class="status-item">Cursor: ${worldPos.x.toFixed(2)}, ${worldPos.y.toFixed(2)}</div>
            <div class="status-item">Snapped: ${snapped.x}, ${snapped.y}</div>
            <div class="status-item">Mode: ${this.engine.coordinateSystem.currentMode}</div>
            <div class="status-item">Snap: ${this.engine.snapEnabled ? 'ON' : 'OFF'}</div>
            <div class="status-item">Grid: ${this.engine.gridManager.gridSize} ${this.engine.coordinateSystem.units}</div>
        `;
    }
}

export default CoordinateDisplay;
