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
 
    private onMouseUp = (): void => {
        if (!this.chessGameEngine.isAnySelected()) return;
 
        this.raycaster.setFromCamera(this.clickPointer, this.camera);
        const intersects = this.raycaster.intersectObjects(this.children, true);
 
        const item = intersects.find((el) => el.object.userData.ground);
        if (!item) {
            this.chessGameEngine.cancelSelection();
            return;
        }
 
        const actionResult = this.chessGameEngine.deselect(item.object);
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
            intensity: 4,
            lookAt: new Vector3(0, 0, 0),
            castShadow: true,
        });
        this.setupLight({
            color: "#FFFFFF",
            position: new Vector3(0, 8, 8),
            intensity: 4,
            lookAt: new Vector3(0, 0, 0),
        });
    }

    private setupScene(): void {
        // Step 1: Init board geometry and physics body
        this.chessGameEngine.initBoard();
 
        // Step 2: Add board to scene FIRST so getWorldPosition() works for pieces
        this.add(this.chessGameEngine.chessBoard);
 
        // Step 3: Now spawn pieces — each calls getWorldPosition() on a board field
        // which is now correctly in the scene graph → returns real world coordinates
        this.chessGameEngine.initPieces();
 
        // Step 4: Add each piece Object3D to the scene
        const pieces = this.chessGameEngine.getAllPieces();
        pieces.forEach((piece: Piece) => {
            this.add(piece);
        });
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
 
    init(): void {
        this.camera.position.set(0, 11, 8);
        this.camera.lookAt(0, 0, 0);
        this.orbitals.target.set(0, 0, 0);
        this.orbitals.autoRotate = false;
 
        this.setupLights();
        this.setupRaycaster();
 
        // setupScene() handles init order correctly (board before pieces)
        this.setupScene();
 
        // Start game: assign sides, init AI worker, set camera
        this.startGame();
    }
 
    private startGame(): void {
        this.orbitals.autoRotate = false;
        const playerStartingSide = this.chessGameEngine.start(
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
        this.setCameraPosition(playerStartingSide);
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
 