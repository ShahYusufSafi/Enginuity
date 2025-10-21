export function calculateDistancePtoL(pointX: number, pointY: number, 
    x1: number, y1: number, x2: number, y2: number) {
    const m = (y2 - y1) / (x2 - x1);
    const A = m;
    const B = -1;
    const C = y1 - m * x1;

    const Distance = Math.abs(A * pointX + B * pointY + C) / Math.sqrt(A * A + B * B);
    return Distance;
}
