import React, { useEffect, useRef } from "react";

interface SvgLoaderProps {
  url: string;
}

export default function SvgLoader({url}: SvgLoaderProps): React.ReactElement {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const selectedElementRef = useRef<SVGElement | Element | null>(null);
  //the URL is handled in vite.config.ts for being accessible (proxy way)

  useEffect(() => {
    if (!url) return;

    let svgEl: SVGSVGElement | null = null;
    let pointerOverHandler: ((e: PointerEvent) => void) | null = null;
    let pointerOutHandler: ((e: PointerEvent) => void) | null = null;
    let clickHandler: ((e: MouseEvent) => void) | null = null;
    let keyDownHandler: ((e: KeyboardEvent) => void) | null = null;

    const shapeSelector = "path, line, polyline, polygon, circle, ellipse, rect";

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to fetch SVG: ${res.statusText}`);
        return res.text();
      })

      .then((svgText) => {
        if (!containerRef.current) return;
        containerRef.current.innerHTML = svgText;

        svgEl = containerRef.current.querySelector("svg");
        if (!svgEl) return;

        // Make it responsive
        svgEl.setAttribute("width", "100%");
        svgEl.setAttribute("height", "100%");
        svgEl.style.width = "100%";
        svgEl.style.height = "100%";

        // Determine a reasonable canvas size for heuristics
        let svgWidth = svgEl.clientWidth || 1000;
        let svgHeight = svgEl.clientHeight || 1000;
        const vb = svgEl.getAttribute("viewBox");
        if (vb) {
          const parts = vb.split(/[\s,]+/).map(Number);
          if (parts.length === 4 && parts[2] && parts[3]) {
            svgWidth = parts[2];
            svgHeight = parts[3];
          }
        } else {
          const wAttr = svgEl.getAttribute("width");
          const hAttr = svgEl.getAttribute("height");
          if (wAttr && hAttr) {
            const parsedW = parseFloat(wAttr);
            const parsedH = parseFloat(hAttr);
            if (!Number.isNaN(parsedW)) svgWidth = parsedW;
            if (!Number.isNaN(parsedH)) svgHeight = parsedH;
          }
        }

        // --- Remove only background rects (heuristic: very large rect covering canvas OR obvious gray fills)
        const rects = Array.from(svgEl.querySelectorAll("rect"));
        rects.forEach((rect) => {
          try {
            const bbox = rect.getBBox();
            const fillAttr = (rect.getAttribute("fill") || "").toLowerCase();
            const computedFill = (window.getComputedStyle(rect).fill || "").toLowerCase();

            const coversCanvas =
              bbox.width >= svgWidth * 0.9 && bbox.height >= svgHeight * 0.9;
            const grayish =
              fillAttr.includes("gray") ||
              fillAttr === "#808080" ||
              fillAttr === "#ccc" ||
              computedFill.includes("gray");

            if (coversCanvas || grayish) {
              rect.remove();
            }
          } catch {
            // getBBox can throw for some nodes — ignore and continue
          }
        });

        // --- Prepare shapes: store original stroke/width so we can restore later
        const allShapes = Array.from(svgEl.querySelectorAll(shapeSelector)) as SVGElement[];
        allShapes.forEach((el) => {
          // store original stroke & stroke-width (if present)
          const computed = window.getComputedStyle(el as any);
          const curStroke = el.getAttribute("stroke") ?? computed.stroke ?? "";
          const curStrokeWidth = el.getAttribute("stroke-width") ?? computed.strokeWidth ?? "";

          if (curStroke) el.dataset.origStroke = curStroke;
          if (curStrokeWidth) el.dataset.origStrokeWidth = curStrokeWidth;

          // sensible defaults for typical CAD geometry
          if (["path", "polyline", "line", "polygon"].includes(el.tagName.toLowerCase())) {
            if (!el.getAttribute("stroke")) el.setAttribute("stroke", curStroke || "#000");
            if (!el.getAttribute("fill")) el.setAttribute("fill", "none");
          }

          // make sure we can click/hover them
          (el as any).style.pointerEvents = "auto";
        });

        // Helper: return actual shape set to operate on.
        // If a <g> is passed, returns all child shapes inside it; if a shape is passed, returns that shape.
        function getShapesForElement(elem: Element | null): SVGElement[] {
          if (!elem) return [];
          if (elem.tagName.toLowerCase() === "g") {
            return Array.from(elem.querySelectorAll(shapeSelector)) as SVGElement[];
          }
          if ((elem as Element).matches && (elem as Element).matches(shapeSelector)) {
            return [elem as SVGElement];
          }
          // maybe clicked a child text node — find nearest ancestor shape
          const shapeAncestor = (elem as Element).closest(shapeSelector);
          return shapeAncestor ? ([shapeAncestor as SVGElement]) : [];
        }

        function restoreShapes(shapes: SVGElement[]) {
          shapes.forEach((s) => {
            if (s.dataset.origStroke) {
              s.setAttribute("stroke", s.dataset.origStroke);
            } else {
              s.removeAttribute("stroke");
            }

            if (s.dataset.origStrokeWidth) {
              s.setAttribute("stroke-width", s.dataset.origStrokeWidth);
            } else {
              s.removeAttribute("stroke-width");
            }
            // cleanup hover temp
            delete s.dataset.hoverStroke;
          });
        }

        function highlightShapes(shapes: SVGElement[], stroke = "blue", strokeWidth = "2") {
          shapes.forEach((s) => {
            // store hover fallback if not already stored
            if (!s.dataset.hoverStroke) s.dataset.hoverStroke = s.getAttribute("stroke") ?? "";
            s.setAttribute("stroke", stroke);
            s.setAttribute("stroke-width", strokeWidth);
          });
        }

        function selectElement(elem: Element | null) {
          // restore previous selection
          if (selectedElementRef.current) {
            const prevShapes = getShapesForElement(selectedElementRef.current);
            restoreShapes(prevShapes);
          }

          if (!elem) {
            selectedElementRef.current = null;
            return;
          }

          selectedElementRef.current = elem;
          const shapesToHighlight = getShapesForElement(elem);
          highlightShapes(shapesToHighlight, "red", "3");
        }

        // --- Event delegation handlers (attach to <svg>)
        pointerOverHandler = (e: PointerEvent) => {
          const target = (e.target as Element).closest(shapeSelector) as Element | null;
          if (!target) return;

          // don't override selected element visuals
          if (
            selectedElementRef.current &&
            (selectedElementRef.current === target || (selectedElementRef.current as Element).contains(target))
          ) {
            return;
          }
          const shapes = getShapesForElement(target);
          highlightShapes(shapes, "blue", "2");
        };

        pointerOutHandler = (e: PointerEvent) => {
          const target = (e.target as Element).closest(shapeSelector) as Element | null;
          if (!target) return;

          // don't override selected element visuals
          if (
            selectedElementRef.current &&
            (selectedElementRef.current === target || (selectedElementRef.current as Element).contains(target))
          ) {
            return;
          }
          const shapes = getShapesForElement(target);
          // restore to original or hover fallback
          shapes.forEach((s) => {
            if (s.dataset.hoverStroke) {
              const hs = s.dataset.hoverStroke;
              if (hs) s.setAttribute("stroke", hs);
              else if (s.dataset.origStroke) s.setAttribute("stroke", s.dataset.origStroke);
              else s.removeAttribute("stroke");
              delete s.dataset.hoverStroke;
            } else {
              // safe restore
              if (s.dataset.origStroke) s.setAttribute("stroke", s.dataset.origStroke);
              else s.removeAttribute("stroke");
            }
            if (s.dataset.origStrokeWidth) s.setAttribute("stroke-width", s.dataset.origStrokeWidth);
            else s.removeAttribute("stroke-width");
          });
        };

        clickHandler = (e: MouseEvent) => {
          // if clicked background (no shape), deselect
          const clickedShape = (e.target as Element).closest(shapeSelector) as Element | null;
          if (!clickedShape) {
            selectElement(null);
            return;
          }

          e.stopPropagation();

          // If there's a meaningful group ancestor, select the whole group (useful for CAD grouped walls)
          const group = (clickedShape as Element).closest("g");
          if (group && group !== svgEl && group.querySelector(shapeSelector)) {
            selectElement(group);
          } else {
            selectElement(clickedShape);
          }
        };

        // Delete selected element with Delete/Backspace
        keyDownHandler = (e: KeyboardEvent) => {
          if (e.key === "Delete" || e.key === "Backspace") {
            if (selectedElementRef.current) {
              const toRemove = selectedElementRef.current;
              (toRemove as Element).remove();
              selectedElementRef.current = null;
            }
          }
        };

        // Attach
        svgEl.addEventListener("pointerover", pointerOverHandler);
        svgEl.addEventListener("pointerout", pointerOutHandler);
        svgEl.addEventListener("click", clickHandler);
        document.addEventListener("keydown", keyDownHandler);
      })
      .catch((err) => {
        console.error("Error loading SVG:", err);
      });

    // CLEANUP on unmount
    return () => {
      try {
        if (svgEl) {
          if (pointerOverHandler) svgEl.removeEventListener("pointerover", pointerOverHandler);
          if (pointerOutHandler) svgEl.removeEventListener("pointerout", pointerOutHandler);
          if (clickHandler) svgEl.removeEventListener("click", clickHandler!);
        }
        if (keyDownHandler) document.removeEventListener("keydown", keyDownHandler);
      } catch {
        /* ignore cleanup errors */
      }

      // optionally clear injected html
      if (containerRef.current) containerRef.current.innerHTML = "";
    };
  }, [url]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{
        backgroundImage: `
          linear-gradient(to right, #e0e0e0 1px, transparent 1px),
          linear-gradient(to bottom, #e0e0e0 1px, transparent 1px)
        `,
        backgroundSize: "20px 20px",
        overflow: "auto",
      }}
    />
  );
}
