import { Bishop } from "@/objects/Pieces/Bishop/Bishop";
import { King } from "@/objects/Pieces/King/King";
import { Knight } from "@/objects/Pieces/Knight/Knight";
import { Pawn } from "@/objects/Pieces/Pawn/Pawn";
import { PieceColor } from "@/objects/Pieces/Piece/types";
import { Queen } from "@/objects/Pieces/Queen/Queen";
import { Rook } from "@/objects/Pieces/Rook/Rook";

export type PromotablePieces = "r" | "n" | "q" | "b";

export interface PieceSet {
    p: Pawn[];
    r: Rook[];
    q: Queen[];
    n: Knight[];
    k: King[];
    b: Bishop[];
}

export type Pieces = {
    [key in PieceColor]: PieceSet;
} & {
    b: PieceSet;
    w: PieceSet;
}