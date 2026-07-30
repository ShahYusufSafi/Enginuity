// DrawingEngine/SVGImporter.js
// Loads an SVG file and renders it as Three.js line geometry in the CAD scene.
// SVG coordinate system (Y down) is flipped to Three.js (Y up).

import * as THREE from 'three';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';

export class SVGImporter {
    constructor(engine) {
        this.engine = engine;
        this.loader = new SVGLoader();
        this.importedEntities = []; // tracks only SVG-imported entities
    }

    // ── Remove previously imported SVG entities from scene ──────────────────
    clear() {
        this.importedEntities.forEach(entity => {
            this.engine.scene.remove(entity.object);
            entity.object.geometry?.dispose();
            entity.object.material?.dispose();
            // Remove from engine entity list too
            const idx = this.engine.entities.indexOf(entity);
            if (idx > -1) this.engine.entities.splice(idx, 1);
        });
        this.importedEntities = [];
    }

    // ── Parse raw SVG text and add to scene ─────────────────────────────────
    importFromText(svgText) {
        this.clear();

        let data;
        try {
            data = this.loader.parse(svgText);
        } catch (err) {
            console.error('[SVGImporter] Failed to parse SVG:', err);
            return;
        }

        const allPoints = []; // accumulated for bounding box

        for (const path of data.paths) {
            const style = path.userData?.style ?? {};
            const strokeRaw  = style.stroke;
            const strokeW    = parseFloat(style.strokeWidth) || 1;
            const fillRaw    = style.fill;

            // ── Determine line color ───────────────────────────────────────
            // Prefer stroke; fall back to fill; fall back to dark default.
            let colorHex = 0x1a1a2e;
            const pickColor = (raw) => {
                if (!raw || raw === 'none' || raw === '') return null;
                try {
                    return new THREE.Color(raw).getHex();
                } catch { return null; }
            };
            colorHex = pickColor(strokeRaw) ?? pickColor(fillRaw) ?? colorHex;

            // ── Draw each sub-path as a line strip ─────────────────────────
            for (const subPath of path.subPaths) {
                // 24 divisions gives smooth curves; lower = faster but jagged arcs
                const pts2d = subPath.getPoints(24);
                if (pts2d.length < 2) continue;

                // Flip Y: SVG Y increases downward, Three.js Y increases upward
                const pts3d = pts2d.map(p => new THREE.Vector3(p.x, -p.y, 0));
                allPoints.push(...pts3d);

                const geometry = new THREE.BufferGeometry().setFromPoints(pts3d);
                const material = new THREE.LineBasicMaterial({ color: colorHex });
                const line     = new THREE.Line(geometry, material);

                const entity = {
                    type: 'svg-path',
                    object: line,
                    originalColor: material.color.clone(),
                    selected: false,
                };

                this.engine.scene.add(line);
                this.importedEntities.push(entity);
                this.engine.entities.push(entity);
            }
        }

        if (allPoints.length === 0) {
            console.warn('[SVGImporter] No renderable paths found in SVG.');
            return;
        }

        // ── Center geometry at world origin ──────────────────────────────────
        const box    = new THREE.Box3();
        allPoints.forEach(v => box.expandByPoint(v));
        const center = box.getCenter(new THREE.Vector3());
        const size   = box.getSize(new THREE.Vector3());

        this.importedEntities.forEach(entity => {
            entity.object.position.sub(center);
        });

        // ── Fit camera to the imported drawing ───────────────────────────────
        this.engine.fitToView(size);

        console.log(
            `[SVGImporter] Loaded ${this.importedEntities.length} path(s). ` +
            `Bounds: ${size.x.toFixed(1)} × ${size.y.toFixed(1)}`
        );
    }

    // ── Load from a File object (from <input type="file">) ──────────────────
    importFromFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    this.importFromText(e.target.result);
                    resolve();
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }

    // ── Load from a URL (e.g. the converter service /SVGs/<id>.svg) ──────────
    importFromUrl(url) {
        return fetch(url)
            .then(res => {
                if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
                return res.text();
            })
            .then(svgText => this.importFromText(svgText));
    }
}
