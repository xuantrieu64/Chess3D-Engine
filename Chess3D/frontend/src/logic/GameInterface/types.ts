import { PromotablePieces } from "../PiecesContainer/types";

export type OnPromoteBtnClick = (pieceType: PromotablePieces) => void;

export interface GameOverInfo {
    headline: string;
    detail: string;
}