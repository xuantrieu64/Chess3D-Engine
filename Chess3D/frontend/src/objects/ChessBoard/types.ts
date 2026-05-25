// import { Id } from "@/global/types";

// export enum ChessFieldType {
//     BLACK, WHITE,
// }

// export interface DroppableField {
//     planeId: Id;
//     circleId: Id;
// }

export type FieldHighlightType = 'selected' | 'move' | 'capture' | 'check';

export interface HighlightStyle {
    color: number;
    opacity: number;
    useCircle: boolean; // true → small dot, false → full square overlay
}

export const HIGHLIGHT_STYLES: Record<FieldHighlightType, HighlightStyle> = {
    selected: { color: 0xf6f642, opacity: 0.40, useCircle: false },
    move: { color: 0xf6f642, opacity: 0.80, useCircle: true },
    capture: { color: 0xe85050, opacity: 0.42, useCircle: false },
    check: { color: 0xff2020, opacity: 0.55, useCircle: false },
};