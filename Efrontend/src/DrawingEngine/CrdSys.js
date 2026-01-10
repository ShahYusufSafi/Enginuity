// src/core/CoordinateSystem.js - Enhanced
class CoordinateSystem {
    constructor() {
        this.units = 'mm';
        this.precision = 2;
        this.currentMode = 'absolute';
        this.lastPoint = { x: 0, y: 0, z: 0 };
        this.basePoint = { x: 0, y: 0, z: 0 }; // For relative operations
        this.coordinateHistory = [];
        this.maxHistory = 100;
    }
    
    parseInput(input) {
        input = input.trim().toLowerCase();
        
        // Handle special commands
        if (input === 'reset') {
            this.lastPoint = { x: 0, y: 0, z: 0 };
            return this.lastPoint;
        }
        
        if (input === 'undo') {
            return this.undo();
        }
        
        if (input === 'base') {
            this.basePoint = { ...this.lastPoint };
            console.log(`Base point set to: ${this.formatPoint(this.basePoint)}`);
            return this.basePoint;
        }
        
        // Absolute coordinates: "100,200" or "100.5,200.25"
        if (input.includes(',')) {
            const parts = input.split(',').map(p => p.trim());
            
            if (parts.length >= 2) {
                const x = parseFloat(parts[0]);
                const y = parseFloat(parts[1]);
                const z = parts.length > 2 ? parseFloat(parts[2]) : 0;
                
                if (!isNaN(x) && !isNaN(y)) {
                    const point = { x, y, z, mode: 'absolute' };
                    this.saveToHistory(point);
                    this.lastPoint = point;
                    return point;
                }
            }
        }
        
        // Relative Cartesian: "@100,200"
        if (input.startsWith('@') && input.includes(',')) {
            const coordStr = input.substring(1);
            const parts = coordStr.split(',').map(p => p.trim());
            
            if (parts.length >= 2) {
                const dx = parseFloat(parts[0]);
                const dy = parseFloat(parts[1]);
                const dz = parts.length > 2 ? parseFloat(parts[2]) : 0;
                
                if (!isNaN(dx) && !isNaN(dy)) {
                    const point = {
                        x: this.lastPoint.x + dx,
                        y: this.lastPoint.y + dy,
                        z: this.lastPoint.z + dz,
                        mode: 'relative-cartesian'
                    };
                    this.saveToHistory(point);
                    this.lastPoint = point;
                    return point;
                }
            }
        }
        
        // Relative Polar: "@100<45"
        if (input.startsWith('@') && input.includes('<')) {
            const polarStr = input.substring(1);
            const parts = polarStr.split('<').map(p => p.trim());
            
            if (parts.length === 2) {
                const distance = parseFloat(parts[0]);
                const angle = parseFloat(parts[1]);
                
                if (!isNaN(distance) && !isNaN(angle)) {
                    const rad = THREE.MathUtils.degToRad(angle);
                    const point = {
                        x: this.lastPoint.x + distance * Math.cos(rad),
                        y: this.lastPoint.y + distance * Math.sin(rad),
                        z: this.lastPoint.z,
                        mode: 'relative-polar'
                    };
                    this.saveToHistory(point);
                    this.lastPoint = point;
                    return point;
                }
            }
        }
        
        // From base point: "#100,200"
        if (input.startsWith('#') && input.includes(',')) {
            const coordStr = input.substring(1);
            const parts = coordStr.split(',').map(p => p.trim());
            
            if (parts.length >= 2) {
                const x = parseFloat(parts[0]);
                const y = parseFloat(parts[1]);
                const z = parts.length > 2 ? parseFloat(parts[2]) : 0;
                
                if (!isNaN(x) && !isNaN(y)) {
                    const point = {
                        x: this.basePoint.x + x,
                        y: this.basePoint.y + y,
                        z: this.basePoint.z + z,
                        mode: 'from-base'
                    };
                    this.saveToHistory(point);
                    this.lastPoint = point;
                    return point;
                }
            }
        }
        
        throw new Error(`Invalid coordinate format: "${input}". Use: "x,y", "@dx,dy", "@distance<angle", or "#x,y" from base`);
    }
    
    saveToHistory(point) {
        this.coordinateHistory.push({ ...point, timestamp: Date.now() });
        if (this.coordinateHistory.length > this.maxHistory) {
            this.coordinateHistory.shift();
        }
    }
    
    undo() {
        if (this.coordinateHistory.length > 1) {
            this.coordinateHistory.pop(); // Remove current
            const last = this.coordinateHistory[this.coordinateHistory.length - 1];
            this.lastPoint = { ...last };
            return this.lastPoint;
        }
        return this.lastPoint;
    }
    
    formatPoint(point, unit = null) {
        const u = unit || this.units;
        const formatted = {
            x: point.x.toFixed(this.precision),
            y: point.y.toFixed(this.precision),
            z: point.z.toFixed(this.precision)
        };
        return `${formatted.x}, ${formatted.y}, ${formatted.z} ${u}`;
    }
    
    distanceBetween(p1, p2) {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dz = p2.z - p1.z;
        return Math.sqrt(dx*dx + dy*dy + dz*dz);
    }
    
    angleBetween(p1, p2) {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const angle = Math.atan2(dy, dx);
        return THREE.MathUtils.radToDeg(angle);
    }
    
    setUnits(newUnits) {
        const validUnits = ['mm', 'cm', 'm', 'inches', 'feet'];
        if (validUnits.includes(newUnits)) {
            this.units = newUnits;
        }
    }
    
    setPrecision(newPrecision) {
        this.precision = Math.max(0, Math.min(6, newPrecision));
    }
}

export { CoordinateSystem };