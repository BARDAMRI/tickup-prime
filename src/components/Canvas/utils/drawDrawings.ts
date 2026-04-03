import {ChartRenderContext} from '../../../types/chartOptions';
import {PriceRange} from '../../../types/Graph';
import {IDrawingShape} from "../../Drawing/IDrawingShape";
import {AngleShape} from '../../Drawing/AngleShape';
import {FinalDrawingStyle} from "../../../types/Drawings";

function resolveFinalStyle(
    shape: IDrawingShape,
    index: number,
    selectedIndex: number | null,
): FinalDrawingStyle | null {
    if (!shape?.style) {
        return null;
    }
    let finalStyle: FinalDrawingStyle = {
        lineColor: shape.style.lineColor as string,
        lineWidth: shape.style.lineWidth as number,
        lineStyle: shape.style.lineStyle as FinalDrawingStyle['lineStyle'],
        fillColor: shape.style.fillColor as string,
        glowColor: shape.style.glowColor,
        glowBlur: shape.style.glowBlur,
    };

    const sel = shape.style.selected;
    if (selectedIndex === index && sel) {
        finalStyle.lineColor = sel.lineColor as string;
        finalStyle.lineWidth = (finalStyle.lineWidth || 1) + (sel.lineWidthAdd || 1) as number;
        finalStyle.lineStyle = (sel.lineStyle || finalStyle.lineStyle) as FinalDrawingStyle['lineStyle'];
        if (sel.fillColor) finalStyle.fillColor = sel.fillColor as string;
        if (sel.glowColor) finalStyle.glowColor = sel.glowColor;
        if (typeof sel.glowBlur === 'number') finalStyle.glowBlur = sel.glowBlur;
    }
    return finalStyle;
}

export function drawDrawings(
    ctx: CanvasRenderingContext2D,
    drawings: IDrawingShape[],
    selectedIndex: number | null,
    renderContext: ChartRenderContext,
    visiblePriceRange: PriceRange,
): void {
    drawings.forEach((shape, index) => {
        const finalStyle = resolveFinalStyle(shape, index, selectedIndex);
        if (!finalStyle) {
            return;
        }
        ctx.save();
        ctx.shadowColor = finalStyle.glowColor ?? 'transparent';
        ctx.shadowBlur = Math.max(0, finalStyle.glowBlur ?? 0);
        if (shape instanceof AngleShape) {
            shape.drawGeometry(ctx, renderContext, visiblePriceRange, finalStyle);
        } else {
            shape.draw(ctx, renderContext, visiblePriceRange, finalStyle);
        }
        ctx.restore();
    });

    drawings.forEach((shape, index) => {
        const finalStyle = resolveFinalStyle(shape, index, selectedIndex);
        if (!finalStyle) {
            return;
        }
        if (shape instanceof AngleShape) {
            shape.drawLabelOverlay(ctx, renderContext, visiblePriceRange, finalStyle);
        }
    });
}
