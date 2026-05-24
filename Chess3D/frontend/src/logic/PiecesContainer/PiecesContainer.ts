import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ChessBoard } from "@/objects/ChessBoard/ChessBoard";
import { World } from 'cannon-es';
import { PieceChessPosition, PieceColor } from '@/objects/Pieces/Piece/types';
import { Vector3 } from 'three';
import { Pieces, PieceSet, PromotablePieces } from './types';
import { Piece } from '@/objects/Pieces/Piece/Piece';
import { Pawn } from '@/objects/Pieces/Pawn/Pawn';
import { Rook } from '@/objects/Pieces/Rook/Rook';
import { Knight } from '@/objects/Pieces/Knight/Knight';
import { Bishop } from '@/objects/Pieces/Bishop/Bishop';
import { Queen } from '@/objects/Pieces/Queen/Queen';
import { King } from '@/objects/Pieces/King/King';
 
export const PAWN_NAME = "Pawn";
export const KING_NAME = "King";
export const QUEEN_NAME = "Queen";
export const ROOK_NAME = "Rook";
export const BISHOP_NAME = "Bishop";
export const KNIGHT_NAME = "Knight";
 
export class PiecesContainer {
    private pieces!: Pieces;
 
    constructor(
        private chessBoard: ChessBoard,
        private loader: GLTFLoader,
        private world: World
    ) {}

 
    /**
     * FIX: Loop từ 0→7 thay vì 7→0 (cosmetic, không ảnh hưởng chess logic)
     * White pawns: row=1, columns 0-7
     * Black pawns: row=6, columns 0-7
     */
    private initPawns(color: PieceColor): Pawn[] {
        const row = color === "w" ? 1 : 6;
        const pawns: Pawn[] = [];
 
        for (let i = 0; i < 8; i++) {
            const pawn = new Pawn(this.concatPieceName(PAWN_NAME, color, i), {
                initialChessPosition: { row, column: i },
                color,
            });
            this.setupPiecePosition(pawn, { row, column: i });
            pawns.push(pawn);
        }
        return pawns;
    }

    private initRooks(color: PieceColor): Rook[] {
        const row = this.getMajorPieceInitialRow(color);
        return [
            this.createRook(color, { row, column: 0 }),   // h-file (column 0 = h)
            this.createRook(color, { row, column: 7 }),   // a-file (column 7 = a)
        ];
    }
 
    private createRook(color: PieceColor, chessPosition: PieceChessPosition, promoted?: boolean): Rook {
        const rook = new Rook(
            this.concatPieceName(ROOK_NAME, color, chessPosition.column, promoted),
            { initialChessPosition: chessPosition, color }
        );
        this.setupPiecePosition(rook, chessPosition);
        return rook;
    }
 
    private initKnights(color: PieceColor): Knight[] {
        const row = this.getMajorPieceInitialRow(color);
        return [
            this.createKnight(color, { row, column: 1 }),  // g-file
            this.createKnight(color, { row, column: 6 }),  // b-file
        ];
    }
 
    private createKnight(color: PieceColor, chessPosition: PieceChessPosition, promoted?: boolean): Knight {
        const knight = new Knight(
            this.concatPieceName(KNIGHT_NAME, color, chessPosition.column, promoted),
            { initialChessPosition: chessPosition, color }
        );
        this.setupPiecePosition(knight, chessPosition);
 
        // Black knights face the opposite direction
        if (color === "b" && knight.body) {
            knight.body.quaternion.setFromEuler(0, Math.PI, 0);
        }
        return knight;
    }
 
    private initBishops(color: PieceColor): Bishop[] {
        const row = this.getMajorPieceInitialRow(color);
        return [
            this.createBishop(color, { row, column: 2 }),  // f-file
            this.createBishop(color, { row, column: 5 }),  // c-file
        ];
    }
 
    private createBishop(color: PieceColor, chessPosition: PieceChessPosition, promoted?: boolean): Bishop {
        const bishop = new Bishop(
            this.concatPieceName(BISHOP_NAME, color, chessPosition.column, promoted),
            { initialChessPosition: chessPosition, color }
        );
        this.setupPiecePosition(bishop, chessPosition);
 
        if (bishop.body) {
            bishop.body.quaternion.setFromEuler(0, Math.PI / 3, 0);
        }
        return bishop;
    }
 
    private initQueens(color: PieceColor): Queen[] {
        const row = this.getMajorPieceInitialRow(color);
        // d-file = column 4 in reversed mapping (ChessFieldLetters: 4="d")
        return [this.createQueen(color, { row, column: 4 })];
    }
 
    private createQueen(color: PieceColor, chessPosition: PieceChessPosition, promoted?: boolean): Queen {
        const queen = new Queen(
            this.concatPieceName(QUEEN_NAME, color, chessPosition.column, promoted),
            { initialChessPosition: chessPosition, color }
        );
        this.setupPiecePosition(queen, chessPosition);
        return queen;
    }
 
    private initKing(color: PieceColor): King[] {
        const row = this.getMajorPieceInitialRow(color);
        // e-file = column 3 in reversed mapping (ChessFieldLetters: 3="e")
        const king = new King(
            this.concatPieceName(KING_NAME, color, 3),
            { initialChessPosition: { row, column: 3 }, color }
        );
        this.setupPiecePosition(king, { row, column: 3 });
        return [king];
    }
 
    private concatPieceName(name: string, color: PieceColor, column: number, promoted?: boolean): string {
        return `${name}${column}${color === "w" ? "White" : "Black"}${promoted ? "Promoted" : ""}`;
    }
 
    private getMajorPieceInitialRow(color: PieceColor): number {
        return color === "w" ? 0 : 7;
    }
 
    /**
     * Get the world position of a board field and use it to initialize the piece.
     *
     * CRITICAL: This function requires chessBoard to already be in the Three.js scene
     * graph, otherwise getWorldPosition() returns (0,0,0).
     *
     * This is guaranteed by ChessScene.setupScene() which adds the board to scene
     * before calling engine.initPieces().
     */
    private setupPiecePosition(piece: Piece, chessPosition: PieceChessPosition): void {
        const initialPosition = this.getFieldPosition(chessPosition);
        const body = piece.init(initialPosition, this.loader);
        this.world.addBody(body);
    }
 
    private getFieldPosition(chessPosition: PieceChessPosition): Vector3 {
        const { row, column } = chessPosition;
        const field = this.chessBoard.getField(row, column);
        const position = new Vector3();
        field?.getWorldPosition(position);
        return position;
    }
 
    private reducePieces(color: PieceColor): Piece[] {
        const pieceSet = this.pieces[color];
        let result: Piece[] = [];
        for (const arr of Object.values(pieceSet)) {
            result = result.concat(arr);
        }
        return result;
    }
 
 
    removePiece(color: PieceColor, type: keyof PieceSet, chessPosition: PieceChessPosition): number | undefined {
        const pieceSet: Piece[] = this.pieces[color][type];
        const { row, column } = chessPosition;
 
        const idx = pieceSet.findIndex(
            (p) => p.chessPosition.row === row && p.chessPosition.column === column
        );
        if (idx === -1) return undefined;
 
        const removed = pieceSet[idx];
        if (removed.body) this.world.removeBody(removed.body);
        pieceSet.splice(idx, 1);
        removed.dispose();
        return removed.id;
    }
 
    addPromotedPiece(color: PieceColor, type: PromotablePieces, chessPosition: PieceChessPosition): Piece {
        let promotedPiece: Piece;
        switch (type) {
            case "q": promotedPiece = this.createQueen(color, chessPosition, true); break;
            case "n": promotedPiece = this.createKnight(color, chessPosition, true); break;
            case "b": promotedPiece = this.createBishop(color, chessPosition, true); break;
            case "r": promotedPiece = this.createRook(color, chessPosition, true); break;
        }
        this.pieces[color][type].push(promotedPiece);
        return promotedPiece;
    }
 
    initPieces(): void {
        this.pieces = {
            b: {
                p: this.initPawns("b"),
                r: this.initRooks("b"),
                n: this.initKnights("b"),
                b: this.initBishops("b"),
                q: this.initQueens("b"),
                k: this.initKing("b"),
            },
            w: {
                p: this.initPawns("w"),
                r: this.initRooks("w"),
                n: this.initKnights("w"),
                b: this.initBishops("w"),
                q: this.initQueens("w"),
                k: this.initKing("w"),
            },
        };
    }
 
    getPiece(color: PieceColor, type: keyof PieceSet, chessPosition: PieceChessPosition): Piece | undefined {
        const { row, column } = chessPosition;
        return this.pieces[color][type].find(
            (p) => p.chessPosition.row === row && p.chessPosition.column === column
        );
    }
 
    getAllPieces(): Piece[] {
        return [...this.reducePieces("w"), ...this.reducePieces("b")];
    }
 
    update(): void {
        for (const color of ["w", "b"] as PieceColor[]) {
            for (const pieceArr of Object.values(this.pieces[color])) {
                for (const piece of pieceArr) {
                    piece.update();
                }
            }
        }
    }
 
    cleanup(): void {
        this.getAllPieces().forEach((p) => p.dispose());
    }
}