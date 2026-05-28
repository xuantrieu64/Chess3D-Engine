import { ChessGameEngine } from "@/logic/ChessGameEngine/ChessGameEngine";
import { BasicScene } from "../BasicScene/BasicScene";
import { Raycaster, Vector2, Vector3 } from "three";
import { BasicSceneProps } from "../BasicScene/types";
import { isPiece } from "@/utils/chess";
import { Piece } from "@/objects/Pieces/Piece/Piece";
import { PieceColor } from "@/objects/Pieces/Piece/types";
import { ActionResult, PromotionResult } from "@/logic/ChessGameEngine/types";

export class ChessScene extends BasicScene {
    private chessGameEngine: ChessGameEngine;
    private raycaster!: Raycaster;
    private clickPointer!: Vector2;

    private boundOnMouseDown!: (event: MouseEvent) => void;
    private boundOnMouseUp!: (event: MouseEvent) => void;
    private boundOnPointerMove!: (event: MouseEvent) => void;

    constructor(props: BasicSceneProps) {
        super(props);
        this.chessGameEngine = new ChessGameEngine(this.world, this.loader);
    }

    private getCoords(event: MouseEvent): { x: number; y: number } {
        return {
            x: (event.clientX / window.innerWidth) * 2 - 1,
            y: -(event.clientY / window.innerHeight) * 2 + 1,
        };
    }

    private setupRaycaster(): void {
        this.raycaster = new Raycaster();
        this.clickPointer = new Vector2();

        this.boundOnMouseDown = this.onMouseDown.bind(this);
        this.boundOnMouseUp = this.onMouseUp.bind(this);
        this.boundOnPointerMove = this.onPointerMove.bind(this);

        window.addEventListener("mousedown", this.boundOnMouseDown);
        window.addEventListener("mouseup", this.boundOnMouseUp);
        window.addEventListener("pointermove", this.boundOnPointerMove);
    }

    private onMouseDown = (event: MouseEvent): void => {
        const { x, y } = this.getCoords(event);
        this.clickPointer.set(x, y);
        this.selectPiece();
    };

    private selectPiece(): void {
        if (this.chessGameEngine.isAnySelected()) return;

        this.raycaster.setFromCamera(this.clickPointer, this.camera);
        const intersects = this.raycaster.intersectObjects(this.children, true);

        const found = intersects.find((el) => el.object.userData.lastParent);
        if (!found) return;

        const { lastParent } = found.object.userData;
        if (!lastParent || !isPiece(lastParent)) return;

        this.chessGameEngine.select(lastParent);
    }

    private onMouseUp = async (): Promise<void> => {
        if (!this.chessGameEngine.isAnySelected()) return;

        this.raycaster.setFromCamera(this.clickPointer, this.camera);
        const intersects = this.raycaster.intersectObjects(this.children, true);

        const item = intersects.find((el) => el.object.userData.ground);
        if (!item) {
            this.chessGameEngine.cancelSelection();
            return;
        }

        // ✅ await để model load xong trước khi add vào scene
        const actionResult = await this.chessGameEngine.deselect(item.object);
        if (!actionResult) return;

        this.onActionPerformed(actionResult);
    };

    private onPointerMove = (event: MouseEvent): void => {
        if (!this.chessGameEngine.isAnySelected()) return;

        const { x, y } = this.getCoords(event);
        this.clickPointer.set(x, y);
        this.raycaster.setFromCamera(this.clickPointer, this.camera);

        const intersects = this.raycaster.intersectObjects(this.children, true);
        const item = intersects.find((el) => el.object.userData.ground);
        if (!item) return;

        this.chessGameEngine.moveSelectedPiece(item.point.x, item.point.z);
    };

    private setupLights(): void {
        this.setupLight({
            color: "#FFFFFF",
            position: new Vector3(0, 8, -8),
            intensity: 10,
            lookAt: new Vector3(0, 0, 0),
        });
        this.setupLight({
            color: "#FFFFFF",
            position: new Vector3(5, 10, 0),
            intensity: 10,
            lookAt: new Vector3(0, 0, 0),
            castShadow: true,
        });
        this.setupLight({
            color: "#FFFFFF",
            position: new Vector3(0, 8, 8),
            intensity: 10,
            lookAt: new Vector3(0, 0, 0),
        });
        this.setupLight({
            color: "#FFF5E1",
            position: new Vector3(0, 6, 18),
            intensity: 100,
            lookAt: new Vector3(0, 0, 0),
        });
    }

    /**
     * ✅ REFACTORED: setupScene() is now async and awaits model loading
     * 
     * Flow:
     * 1. Init board geometry + physics
     * 2. Add board to scene (so getWorldPosition() works)
     * 3. Create 32 pieces + add physics bodies (SYNC)
     * 4. Add all pieces to scene (SYNC)
     * 5. Load all 32 piece models in parallel (ASYNC - await)
     * 6. Add all pieces Object3D to scene (already done in step 4)
     */
    private async setupScene(): Promise<void> {
        await this.chessGameEngine.initBoard();
        this.add(this.chessGameEngine.chessBoard);
        this.chessGameEngine.initPieces();
        const pieces = this.chessGameEngine.getAllPieces();
        pieces.forEach((piece: Piece) => {
            this.add(piece);
        });
        try {
            await this.chessGameEngine.initModels();
        } catch (err) {
            console.error("[ChessScene] ✗ Failed to load models:", err);
            throw err;
        }
    }

    private setCameraPosition(playerStartingSide: PieceColor): void {
        const z = playerStartingSide === "w" ? -8 : 8;
        this.camera.position.set(0, 15, z);
        this.camera.lookAt(0, 0, 0);
        this.orbitals.target.set(0, 0, 0);
        this.orbitals.update();
    }

    private onActionPerformed(actionResult: ActionResult): void {
        const { removedPiecesIds, promotedPiece } = actionResult;
        this.removePiecesFromScene(removedPiecesIds);
        if (promotedPiece) {
            this.add(promotedPiece);
        }
    }

    private removePiecesFromScene(piecesIds: number[]): void {
        piecesIds.forEach((id) => {
            const obj = this.getObjectById(id);
            if (obj) this.remove(obj);
        });
    }

    /**
     * ✅ REFACTORED: init() is now async
     * Awaits setupScene() before starting the game
     */
    async init(): Promise<void> {
        this.camera.position.set(0, 11, 8);
        this.camera.lookAt(0, 0, 0);
        this.orbitals.target.set(0, 0, 0);
        this.orbitals.autoRotate = false;

        this.setupLights();
        this.setupRaycaster();

        const playerSide = this.chessGameEngine.prepareSide();
        this.setCameraPosition(playerSide);

        try {
            await this.setupScene();
        } catch (err) {
            console.error("[ChessScene] Scene setup failed:", err);
            throw err;
        }

        // Start game only AFTER models are loaded
        this.startGame();
    }

    private startGame(): void {
        this.orbitals.autoRotate = false;
        this.chessGameEngine.start(
            (actionResult: ActionResult) => {
                this.onActionPerformed(actionResult);
            },
            (_chessInstance, playerColor) => {
                console.log("[Chess3D] Game over. Player color:", playerColor);
            },
            (promotionResult: PromotionResult) => {
                this.onActionPerformed({
                    removedPiecesIds: [promotionResult.removedPieceId],
                    promotedPiece: promotionResult.promotedPiece,
                });
            }
        );
    }

    update(): void {
        this.chessGameEngine.updatePhysics();
        this.chessGameEngine.updateAnimations();
        super.update();
    }

    cleanup(): void {
        window.removeEventListener("mousedown", this.boundOnMouseDown);
        window.removeEventListener("mouseup", this.boundOnMouseUp);
        window.removeEventListener("pointermove", this.boundOnPointerMove);
        this.chessGameEngine.cleanup();
        super.cleanup();
    }
}