import { ChessAi } from "../ChessAi/ChessAi"
import { WebWorkerEvent } from "./types"

const chessAiManager = new ChessAi()

addEventListener("message", (e: WebWorkerEvent) => {
    const { type } = e.data

    switch (type) {
        case "init": {
            chessAiManager.init(e.data.color, e.data.fen);

            // If AI is black, it moves second — wait for player's first move
            if (chessAiManager.isBlack()) return;

            // AI is white — move first
            const move = chessAiManager.calcAiMove();
            // BUG FIX: always post result (null-safe on host side)
            postMessage({ type: "aiMovePerformed", aiMove: move });
            break;
        }

        case "aiMove": {
            chessAiManager.updateBoardWithPlayerMove(e.data.playerMove);
            const move = chessAiManager.calcAiMove();
            postMessage({ type: "aiMovePerformed", aiMove: move });
            break;
        }

        case "aiMoveAfterPromotion": {
            
            chessAiManager.updateBoardFromFen(e.data.fen);

            const move = chessAiManager.calcAiMove();
            postMessage({ type: "aiMovePerformed", aiMove: move });
            break;
        }

        default:
            break;
    }
})