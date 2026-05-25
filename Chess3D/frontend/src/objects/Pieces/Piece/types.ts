export type PieceColor = "w" | "b";

export interface PieceChessPosition {
    row: number;
    column: number;
}

export interface PieceOptions {
    initialChessPosition: PieceChessPosition;
    color: PieceColor;
}