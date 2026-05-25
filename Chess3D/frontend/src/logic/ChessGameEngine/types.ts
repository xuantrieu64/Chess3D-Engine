import { Piece } from "@/objects/Pieces/Piece/Piece";
import { PieceColor } from "@/objects/Pieces/Piece/types";
import { Chess, Move, Square } from "chess.js";
import { Object3D } from "three";
import { PromotablePieces } from "../PiecesContainer/types";

export type AiMoveCallback = (actionResult: ActionResult) => void;

export type OnPromotion = (promotionResult: PromotionResult) => void;

export type ChessInstance = InstanceType<typeof Chess>;

export type onEndGame = (
    chessInstance: ChessInstance,
    playerColor: PieceColor
) => void;

export interface PromotionPayload {
    color: PieceColor;
    droppedField: Object3D;
    piece: Piece;
    promotedPieceKey: PromotablePieces;
    move?: Move;
}

export interface PromotionWebWorkerEvent {
    color: PieceColor;
    pieceType: PromotablePieces;
    chessNotationPos: Square;
    move?: Move;
    type: "promote";
}

export interface InitWebWorkerEvent {
    fen: string;
    color: PieceColor;
    type: "init";
}

export interface AiMoveWebWorkerEvent {
    playerMove: Move;
    type: "aiMove";
}

export interface AiPerformedMoveWebWorkerEvent {
    aiMove: Move | null;
    type: "aiMovePerformed";
}

export type WebWorkerEvent =
    | { data: InitWebWorkerEvent }
    | { data: AiMoveWebWorkerEvent }
    | { data: AiPerformedMoveWebWorkerEvent }
    | {
        data: PromotionWebWorkerEvent;
    };

export interface PromotionResult {
    removedPieceId: number;
    promotedPiece: Piece;
}

export interface ActionResult {
    removedPiecesIds: number[];
    promotedPiece?: Piece;
}
export interface MoveResult extends ActionResult {
    move: Move;
    stopAi?: boolean;
}