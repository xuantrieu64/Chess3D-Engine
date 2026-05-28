import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ChessBoard } from "@/objects/ChessBoard/ChessBoard";
import { PiecesContainer } from "../PiecesContainer/PiecesContainer";
import {
    ActionResult, AiMoveCallback, ChessInstance, MoveResult,
    onEndGame, OnPromotion, PromotionPayload, PromotionResult, WebWorkerEvent
} from "./types";
import { PieceChessPosition, PieceColor } from "@/objects/Pieces/Piece/types";
import { GameInterface } from "../GameInterface/GameInterface";
import { Vec3, World } from "cannon-es";
import { Chess, Move, Square } from 'chess.js';
import { getChessNotation, getMatrixPosition, getOppositeColor, isPromotionResult } from '@/utils/chess';
import { Object3D, Vector3 } from 'three';
import { PromotablePieces } from '../PiecesContainer/types';
import { convertThreeVector } from '@/utils/general';
import { Piece } from '@/objects/Pieces/Piece/Piece';
import Worker from 'web-worker';
import { GameOverInfo } from '../GameInterface/types';

export class ChessGameEngine {
    private _chessBoard: ChessBoard;
    private piecesContainer: PiecesContainer;
    private chessGame: ChessInstance;
    private startingPlayerSide!: PieceColor;
    private worker: Worker;
    private gameInterface: GameInterface;

    private loader: GLTFLoader;
    private world: World;

    private selectedInitialPosition: Vec3 | null = null;
    private selected: Piece | null = null;

    private onEndGameCallback!: onEndGame;
    private onPromotionCallback!: OnPromotion;
    private webWorkerCallback!: (e: WebWorkerEvent) => void;

    constructor(world: World, loader: GLTFLoader) {
        this.world = world;
        this.loader = loader;

        this._chessBoard = new ChessBoard("ChessBoard", this.loader);
        this.chessGame = new Chess();
        this.piecesContainer = new PiecesContainer(
            this._chessBoard,
            this.loader,
            this.world
        );
        this.gameInterface = new GameInterface();
        this.worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
    }

    private drawSide(): void {
        this.startingPlayerSide = Math.random() < 0.5 ? "w" : "b";
    }

    private markPossibleMoveFields(chessPosition: PieceChessPosition): void {
        const chessNotation = getChessNotation(chessPosition);
        const possibleMoves = this.chessGame.moves({ square: chessNotation, verbose: true });

        // Highlight the origin square of the selected piece
        this._chessBoard.highlightField(chessPosition.row, chessPosition.column, 'selected');

        possibleMoves.forEach((move) => {
            const { row, column } = getMatrixPosition(move.to);
            this._chessBoard.markPlaneAsDroppable(row, column);

            const isCapture = Boolean(move.captured);
            this._chessBoard.highlightField(row, column, isCapture ? 'capture' : 'move')
        });
    }

    private updateScoreBoard(move: Move): void {
        const { color, captured } = move;
        if (!captured) return;
        if (color === "w") {
            this.gameInterface.addToWhiteScore(captured);
        } else {
            this.gameInterface.addToBlackScore(captured);
        }
    }

    private notifyAiToMove(playerMove: Move): void {
        this.gameInterface.enableOpponentTurnNotification();
        this.worker.postMessage({
            type: "aiMove",
            playerMove,
            fen: this.chessGame.fen()
        });
    }

    private async performPlayerMove(droppedField: Object3D): Promise<MoveResult> {
        if (!this.selected) {
            throw new Error("[ChessGameEngine] No piece selected");
        }
        return await this.handlePieceMove(droppedField, this.selected);
    }

    private async dropPiece(droppedField: Object3D): Promise<ActionResult> {
        const { removedPiecesIds, move: playerMove, promotedPiece, stopAi } =
            await this.performPlayerMove(droppedField);

        this.updateCheckHighlight();

        const isGameOver = this.chessGame.isGameOver();
        if (isGameOver) {
            this.handleGameOver();
        } else if (!stopAi) {
            this.notifyAiToMove(playerMove);
        }

        return { removedPiecesIds, promotedPiece };
    }

    /**
     * BUG FIX: Original called enableOpponentTurnNotification() AFTER AI move —
     * this kept the "AI thinking" overlay on screen permanently.
     * Fix: call disableOpponentTurnNotification() when AI move is done.
     */
    private createWebWorkerCallback(cb: AiMoveCallback): void {
        this.webWorkerCallback = async (e: WebWorkerEvent) => {
            if (e.data.type !== "aiMovePerformed") return;

            const aiMove = (e.data as { type: "aiMovePerformed"; aiMove: Move | null }).aiMove;
            if (!aiMove) {
                console.warn("[ChessGameEngine] AI returned null move — game may be over");
                this.gameInterface.disableOpponentTurnNotification();
                return;
            }

            // ✅ await vì performAiMove là async
            const actionResult = await this.performAiMove(aiMove);

            // Re-evaluate check state after every AI move
            this.updateCheckHighlight();

            cb(actionResult);

            this.gameInterface.disableOpponentTurnNotification();

            if (this.chessGame.isGameOver()) {
                this.handleGameOver();
            }
        };
    }

    private async performAiMove(move: Move): Promise<ActionResult> {
        const { from, to, color, piece } = move;
        const fromPos = getMatrixPosition(from);
        const toPos = getMatrixPosition(to);

        const toField = this._chessBoard.getField(toPos.row, toPos.column);
        const movedPiece = this.piecesContainer.getPiece(color, piece, fromPos);

        if (!toField || !movedPiece) {
            console.error(`[ChessGameEngine] AI move invalid: ${from} -> ${to}`);
            return { removedPiecesIds: [] };
        }

        return await this.moveAiPiece(toField, movedPiece);
    }

    private async moveAiPiece(toField: Object3D, movedPiece: Piece): Promise<ActionResult> {
        movedPiece.removeMass();
        const actionResult = await this.handlePieceMove(toField, movedPiece);
        movedPiece.resetMass();
        return actionResult;
    }

    private async handlePieceMove(field: Object3D, piece: Piece): Promise<MoveResult> {
        const { chessPosition: toPosition } = field.userData;
        const { chessPosition: fromPosition } = piece;
        const removedPiecesIds: number[] = [];
        let promoted: Piece | undefined;

        const from = getChessNotation(fromPosition);
        const to = getChessNotation(toPosition);

        const move = this.chessGame.move(`${from}${to}`, { strict: false });
        if (!move) {
            throw new Error(`[ChessGameEngine] Invalid move: ${from} -> ${to}`);
        }

        if (move.captured) {
            const capturedId = this.capturePiece(move);
            this.updateScoreBoard(move);
            if (capturedId !== undefined) removedPiecesIds.push(capturedId);
        }

        // ✅ await handleFlags vì promotion là async
        const result = await this.handleFlags(move, field, piece);

        if (this.isPieceIdToRemove(result)) {
            removedPiecesIds.push(result);
        } else if (isPromotionResult(result)) {
            promoted = result.promotedPiece;
            removedPiecesIds.push(result.removedPieceId);
        }

        this.movePieceToField(field, piece);

        return {
            removedPiecesIds,
            move,
            promotedPiece: promoted,
            stopAi: typeof result === "boolean" && result,
        };
    }

    private capturePiece(move: Move): number | undefined {
        const { to, color, captured } = move;
        if (!captured) return undefined;
        const pos = getMatrixPosition(to);
        const capturedColor = getOppositeColor(color);
        return this.piecesContainer.removePiece(capturedColor, captured, pos);
    }

    private isPieceIdToRemove(id?: unknown): id is number {
        return typeof id === "number";
    }

    private async handleFlags(
        move: Move,
        droppedField: Object3D,
        piece: Piece
    ): Promise<number | boolean | PromotionResult> {
        const { flags, color } = move;
        if (flags === "q" || flags === "k") {
            this.handleCastling(color, flags);
            return false;
        }
        if (flags === "e") return this.handleEnPassante(color, droppedField);
        if (flags.includes("p")) return await this.handlePromotion(color, droppedField, piece, move);
        return false;
    }

    private handleCastling(color: PieceColor, castlingType: "k" | "q"): void {
        const rookRow = color === "w" ? 0 : 7;
        // ChessFieldColumns: h=0, a=7. Kingside rook is on h-file (col 0), queenside on a-file (col 7)
        const rookColumn = castlingType === "k" ? 0 : 7;
        const castlingRook = this.piecesContainer.getPiece(color, "r", { row: rookRow, column: rookColumn });

        // After kingside castling: rook goes to f-file (col 2); queenside: d-file (col 4)
        const rookTargetColumn = castlingType === "k" ? 2 : 4;
        const castlingField = this._chessBoard.getField(rookRow, rookTargetColumn);

        if (!castlingField || !castlingRook) {
            console.warn(`[ChessGameEngine] Castling not found: ${castlingType} ${color}`);
            return;
        }
        this.movePieceToField(castlingField, castlingRook);
    }

    private handleEnPassante(color: PieceColor, droppedField: Object3D): number {
        const { chessPosition } = droppedField.userData;
        const { row, column }: PieceChessPosition = chessPosition;
        const oppositeColor = getOppositeColor(color);
        const capturedRow = color === "w" ? row - 1 : row + 1;

        const removedId = this.piecesContainer.removePiece(oppositeColor, "p", {
            row: capturedRow, column
        });

        if (removedId === undefined) {
            console.error("[ChessGameEngine] En passant: captured pawn not found");
            return -1;
        }
        return removedId;
    }

    private async handlePromotion(
        color: PieceColor,
        droppedField: Object3D,
        piece: Piece,
        move: Move
    ): Promise<PromotionResult | boolean> {
        if (this.isPlayerColor(color)) {
            this.gameInterface.enablePromotionButtons(color, async (promotedTo: PromotablePieces) => {
                const result = await this.promotePiece({
                    color, droppedField, piece, promotedPieceKey: promotedTo, move
                });
                this.onPromotionCallback(result);

                this.updateCheckHighlight();

                if (this.chessGame.isGameOver()) {
                    this.handleGameOver();
                    this.gameInterface.disableOpponentTurnNotification();
                    return;
                }

                this.notifyAiAfterPlayerPromotion(move, promotedTo);
            });
            return true;
        }

        // ✅ AI promotion — await model load
        return await this.promotePiece({
            color, droppedField, piece, promotedPieceKey: "q", move
        });
    }

    private notifyAiAfterPlayerPromotion(move: Move, promotedTo: PromotablePieces): void {
        // ✅ Clean state trước enable
        this.gameInterface.disableOpponentTurnNotification();
        this.gameInterface.enableOpponentTurnNotification();

        this.worker.postMessage({
            type: "aiMoveAfterPromotion",
            fen: this.chessGame.fen(),
            promotedTo: promotedTo,
            move: move
        });
    }

    private isPlayerColor(color: PieceColor): boolean {
        return color === this.startingPlayerSide;
    }

    private async promotePiece(payload: PromotionPayload): Promise<PromotionResult> {
        const { piece, droppedField, color, promotedPieceKey, move } = payload;
        if (!move) throw new Error("[ChessGameEngine] Promotion missing move data");

        const { chessPosition: piecePosition } = piece;
        const { chessPosition: fieldPosition } = droppedField.userData;
        const notation = getChessNotation(fieldPosition);

        const removedPieceId = this.piecesContainer.removePiece(color, "p", piecePosition);
        if (removedPieceId === undefined) {
            throw new Error("[ChessGameEngine] Promotion: pawn not found");
        }

        const promotedPiece = await this.piecesContainer.addPromotedPiece(color, promotedPieceKey, fieldPosition);
        this.updateChessEngineWithPromotion(color, promotedPieceKey, notation);
        this.updateAiWithPromotion(color, promotedPieceKey, notation, move);

        return { removedPieceId, promotedPiece };
    }

    private updateChessEngineWithPromotion(color: PieceColor, type: PromotablePieces, pos: Square): void {
        this.chessGame.remove(pos);
        this.chessGame.put({ type, color }, pos);
        this.chessGame.load(this.chessGame.fen());
    }

    private updateAiWithPromotion(
        color: PieceColor, pieceType: PromotablePieces, chessNotationPos: Square, move: Move
    ): void {
        this.worker.postMessage({ type: "promote", color, pieceType, chessNotationPos, move });
    }

    private movePieceToField(field: Object3D, piece: Piece): void {
        const { chessPosition } = field.userData;
        const worldPosition = new Vector3();
        field.getWorldPosition(worldPosition);
        piece.changePosition(chessPosition, convertThreeVector(worldPosition), true);
    }

    private removePieceFromWorld(piece: Piece): void {
        if (!piece.body) return;
        piece.removeMass();
        this.world.removeBody(piece.body);
    }

    private addPieceToWorld(piece: Piece): void {
        if (!piece.body) return;
        piece.resetMass();
        this.world.addBody(piece.body);
    }

    private setPieceInitialPosition(piece: Piece | null): void {
        this.selectedInitialPosition = piece?.body ? piece.body.position.clone() : null;
    }

    private resetSelectedPiecePosition(): void {
        if (!this.selected || !this.selectedInitialPosition) return;
        const { x, y, z } = this.selectedInitialPosition;
        this.selected.changeWorldPosition(x, y, z);
        this.setPieceInitialPosition(null);
    }

    private cleanupWebWorker(): void {
        if (this.webWorkerCallback) {
            this.worker.removeEventListener("message", this.webWorkerCallback);
        }
        try { this.worker.terminate(); } catch { /* ignore */ }
    }

    private addWebWorkerListener(cb: AiMoveCallback): void {
        this.createWebWorkerCallback(cb);
        this.worker.addEventListener("message", this.webWorkerCallback);
    }

    private initChessAi(): void {
        if (this.startingPlayerSide !== "w") {
            this.gameInterface.enableOpponentTurnNotification();
        }
        this.worker.postMessage({
            type: "init",
            fen: this.chessGame.fen(),
            color: getOppositeColor(this.startingPlayerSide),
        });
    }

    /**
     * After every move: clear the previous check highlight, then re-draw it
     * if the current player's king is under attack.
     */
    private updateCheckHighlight(): void {
        this._chessBoard.clearCheckHighlight();

        if (!this.chessGame.inCheck()) return;

        const board = this.chessGame.board();
        const currentTurn = this.chessGame.turn() as PieceColor;

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const sq = board[r][c];
                if (sq?.type === "k" && sq.color === currentTurn) {
                    this._chessBoard.highlightField(7 - r, 7 - c, "check");
                    return;
                }
            }
        }
    }

    /**
     * Build a localised GameOverInfo from the current chess.js state and
     * push it to the UI. Called immediately when isGameOver() is true.
     */
    private handleGameOver(): void {
        const info = this.buildGameOverInfo();
        this.gameInterface.showGameOver(info);
        this.onEndGameCallback(this.chessGame, this.startingPlayerSide);
    }

    private buildGameOverInfo(): GameOverInfo {
        const game = this.chessGame;

        if (game.isCheckmate()) {
            const loserIsPlayer = game.turn() === this.startingPlayerSide;
            return loserIsPlayer ? { headline: "You lose", detail: "Chiếu hết" } : { headline: "You win", detail: "Chiếu hết" };
        }

        if (game.isStalemate()) {
            return { headline: "Thua cuộc", detail: "Không còn nước đi hợp lệ" };
        }

        if (game.isInsufficientMaterial()) {
            return { headline: "Hòa cờ! 🤝", detail: "" };
        }

        if (game.isDraw()) {
            return { headline: "Hòa cờ! 🤝", detail: "Quy tắc 50 nước không ăn" };
        }
        return { headline: "Ván cờ kết thúc", detail: "" };
    }

    get chessBoard(): ChessBoard {
        return this._chessBoard;
    }

    isAnySelected(): boolean {
        return !!this.selected;
    }

    select(piece: Piece): void {
        if (!this.isPlayerColor(piece.color)) return;
        this.removePieceFromWorld(piece);
        this.markPossibleMoveFields(piece.chessPosition);
        this.setPieceInitialPosition(piece);
        this.setSelectedPiece(piece);
    }

    async deselect(intersectedField: Object3D): Promise<ActionResult | undefined> {
        const { droppable } = intersectedField.userData;
        let actionResult: ActionResult | undefined;

        if (!droppable) {
            this.resetSelectedPiecePosition();
        } else {
            actionResult = await this.dropPiece(intersectedField);
        }

        this._chessBoard.clearMarkedPlanes();
        this._chessBoard.clearSelectionHighlights();

        if (this.selected) {
            this.addPieceToWorld(this.selected);
        }

        this.setSelectedPiece(null);
        return actionResult;
    }

    cancelSelection(): void {
        this.resetSelectedPiecePosition();
        this._chessBoard.clearMarkedPlanes();
        this._chessBoard.clearSelectionHighlights();
        if (this.selected) this.addPieceToWorld(this.selected);
        this.setSelectedPiece(null);
    }

    private setSelectedPiece(piece: Piece | null): void {
        this.selected = piece;
    }

    getAllPieces(): Piece[] {
        return this.piecesContainer.getAllPieces();
    }

    moveSelectedPiece(x: number, z: number): void {
        if (!this.selected) return;
        this.selected.changeWorldPosition(x, 0.8, z);
    }

    /** Step 1: Create board geometry and physics body (ASYNC) */
    initBoard(): Promise<void> {
        return this._chessBoard.init().then(boardBody => {
            this.world.addBody(boardBody);
        });
    }

    /** Step 2: Spawn all 32 pieces (call AFTER board is added to scene) */
    initPieces(): void {
        this.piecesContainer.initPieces();
    }

    /**
     * Step 3: Load all piece models in parallel (ASYNC)
     * Call AFTER board and pieces are in scene
     */
    async initModels(): Promise<void> {
        await this.piecesContainer.initModelsParallel();
    }


    prepareSide(): PieceColor {
        this.drawSide();
        return this.startingPlayerSide;
    }

    start(
        aiMoveCallback: AiMoveCallback,
        onEndGame: onEndGame,
        onPromotion: OnPromotion
    ): PieceColor {
        this.onEndGameCallback = onEndGame;
        this.onPromotionCallback = onPromotion;

        // this.drawSide();
        this.gameInterface.init(this.startingPlayerSide);
        this.addWebWorkerListener(aiMoveCallback);
        this.initChessAi();

        return this.startingPlayerSide;
    }


    updatePhysics(): void {
        this.world.fixedStep();
        this._chessBoard.update();
    }

    updateAnimations(): void {
        this.piecesContainer.update();
    }

    cleanup(): void {
        this.gameInterface.cleanup();
        this.cleanupWebWorker();
        this._chessBoard.dispose();
        this.piecesContainer.cleanup();
    }
}