import { PieceSquareTables, SquareTableKeys } from "@/contants/types";
import { PieceChessPosition, PieceColor } from "@/objects/Pieces/Piece/types";
import { ChessInstance } from "../ChessGameEngine/types";
import { Chess, Move } from "chess.js";
import { cloneDeep } from "lodash";
import { PIECE_SQUARE_TABLES, PIECE_WEIGHTS } from "@/contants/chess-weights";
import { PieceSet } from "../PiecesContainer/types";
import { getMatrixPosition, isPromotionFlag } from "@/utils/chess";


export class ChessAi {
    private color!: PieceColor;
    private aiSquareTables!: PieceSquareTables;
    private opponentSquareTables!: PieceSquareTables;
    private chessGame: ChessInstance;
    private prevSum = 0;

    constructor() {
        this.chessGame = new Chess();
    }

    private blackStartInit(): void {
        this.aiSquareTables = this.reverseSquareTablesForBlack();
        this.opponentSquareTables = cloneDeep(PIECE_SQUARE_TABLES);
    }

    private whiteStartInit(): void {
        this.aiSquareTables = cloneDeep(PIECE_SQUARE_TABLES);
        this.opponentSquareTables = this.reverseSquareTablesForBlack();
    }

    private reverseSquareTablesForBlack(): PieceSquareTables {
        const cloned = cloneDeep(PIECE_SQUARE_TABLES);

        for (const value of Object.values(cloned)) {
            value.reverse();
        }

        return cloned;
    }

    private minimax(
        depth: number,
        sum: number,
        isMaximizingPlayer: boolean,
        alpha: number,
        beta: number
    ): [Move | null, number] {
        // 1. Điều kiện dừng
        const moves = this.chessGame.moves();
        // Sửa dòng này trong hàm minimax
        if (depth <= 0 || moves.length === 0 || this.chessGame.isGameOver()) {
            return [null, sum];
        }

        let bestMove: Move | null = null;
        let bestVal = isMaximizingPlayer ? -Infinity : Infinity;

        for (const moveNotation of moves) {
            // 2. Thực hiện nước đi và kiểm tra null
            const currentMove = this.chessGame.move(moveNotation);
            if (!currentMove) continue; // Bỏ qua nếu nước đi lỗi

            const newSum = this.evaluateBoard(currentMove, sum);
            const [, childValue] = this.minimax(
                depth - 1,
                newSum,
                !isMaximizingPlayer,
                alpha,
                beta
            );

            // 3. Undo an toàn
            this.chessGame.undo();

            // 4. Cập nhật Alpha-Beta
            if (isMaximizingPlayer) {
                if (childValue > bestVal) {
                    bestVal = childValue;
                    bestMove = currentMove;
                }
                alpha = Math.max(alpha, bestVal);
            } else {
                if (childValue < bestVal) {
                    bestVal = childValue;
                    bestMove = currentMove;
                }
                beta = Math.min(beta, bestVal);
            }

            if (beta <= alpha) break;
        }

        return [bestMove, bestVal];
    }

    private evaluateBoard(move: Move, prevSum: number): number {
        let newSum = prevSum;
        const { row: fromRow, column: fromColumn } = getMatrixPosition(move.from);
        const { row: toRow, column: toColumn } = getMatrixPosition(move.to);
        const { captured, color: moveColor, flags } = move;
        let movedPiece: SquareTableKeys = move.piece;

        if (this.isEndGameKing(prevSum, movedPiece)) {
            movedPiece = "k_endGame";
        }

        // 1. Tính điểm khi có quân bị ăn
        if (captured) {
            if (this.isAiColor(moveColor)) {
                newSum += PIECE_WEIGHTS[captured] +
                    this.getOpponentValueFromSquareTable(captured, {
                        row: toRow,
                        column: toColumn,
                    });
            } else {
                newSum -= PIECE_WEIGHTS[captured] +
                    this.getAiValueFromSquareTable(captured, {
                        row: toRow,
                        column: toColumn,
                    });
            }
        }

        if (isPromotionFlag(flags)) {

            const promoted = (move.promotion || "q") as SquareTableKeys;

            if (this.isAiColor(moveColor)) {

                newSum -= PIECE_WEIGHTS[movedPiece] + this.getAiValueFromSquareTable(movedPiece,
                    {
                        row: fromRow,
                        column: fromColumn,
                    }
                );

                newSum += PIECE_WEIGHTS[promoted] +
                    this.getAiValueFromSquareTable(
                        promoted,
                        {
                            row: toRow,
                            column: toColumn,
                        }
                    );

            } else {

                newSum += PIECE_WEIGHTS[movedPiece] +
                    this.getOpponentValueFromSquareTable(
                        movedPiece,
                        {
                            row: fromRow,
                            column: fromColumn,
                        }
                    );

                newSum -= PIECE_WEIGHTS[promoted] +
                    this.getOpponentValueFromSquareTable(
                        promoted,
                        {
                            row: toRow,
                            column: toColumn,
                        }
                    );
            }
        }

        return newSum;
    }

    private isAiColor(color: PieceColor): boolean {
        return color === this.color;
    }

    private isEndGameKing(prevSum: number, movedPiece: keyof PieceSet): boolean {
        return prevSum < -1500 && movedPiece === "k";
    }

    private getOpponentValueFromSquareTable(
        piece: SquareTableKeys,
        chessPosition: PieceChessPosition
    ): number {
        const { row, column } = chessPosition;
        return this.opponentSquareTables[piece][row][column];
    }

    private getAiValueFromSquareTable(
        piece: SquareTableKeys,
        chessPosition: PieceChessPosition
    ): number {
        const { row, column } = chessPosition;
        return this.aiSquareTables[piece][row][column];
    }

    isWhite(): boolean {
        return this.color === "w";
    }

    isBlack(): boolean {
        return this.color === "b";
    }

    init(color: PieceColor, fen: string): void {
        this.color = color;
        this.chessGame.load(fen);

        if (this.isBlack()) {
            this.blackStartInit();
            return;
        }

        this.whiteStartInit();
    }

    updateBoardWithPlayerMove(move: Move): void {

        try {

            const result = this.chessGame.move(move);

            if (!result) {
                console.warn("[ChessAI] Invalid player move", move);
                return;
            }

            this.prevSum = this.evaluateBoard(result, this.prevSum);

        } catch (error) {
            console.error("[ChessAI] Failed to apply player move:", move, error);
        }
    }

    calcAiMove(): Move | null {
        const [move, sum] = this.minimax(
            3,
            this.prevSum,
            true,
            -Infinity,
            +Infinity
        );
        if (move === null) {
            console.warn("AI has no valid moves left (Game Over).");
            return null;
        }

        this.prevSum = sum;
        this.chessGame.move(move);

        return move;
    }

    public updateBoardFromFen(fen: string): void {
        this.chessGame.load(fen);
        this.prevSum = 0;
    }
}