import { Id } from "@/global/types";
import { BaseGroup } from "../BaseGroup/BaseGroup";
import { ChessBase } from "../ChessBase/ChessBase";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { BufferGeometry, CircleGeometry, Color, FrontSide, Material, Mesh, MeshBasicMaterial, MeshPhongMaterial, Object3D, PlaneGeometry } from "three";
import { BLACK_COLOR_FIELD, WHITE_COLOR_FIELD } from "@/contants/colors";
import { Body, Box, Vec3 } from "cannon-es";
import { FieldHighlightType, HIGHLIGHT_STYLES } from "./types";
import { HIGHLIGHT_Y_OFFSET } from "@/contants/highlight";


export const FIELD_NAME = "Field";


export class ChessBoard extends BaseGroup {
    private readonly size = 8;
    private chessBase: ChessBase;
    private loader: GLTFLoader;

    private boardMatrix: Array<Id[]> = [];

    private selectionOverlays: Map<string, Mesh> = new Map();
    private stateOverlays: Map<string, Mesh> = new Map();

    constructor(name: string, loader: GLTFLoader) {
        super(name);
        this.loader = loader;
        this.chessBase = new ChessBase("ChessBase");
    }

    private createBoardMatrix(): void {
        this.boardMatrix = [];
        let colorBlack = true;

        for (let i = 0; i < this.size; i++) {
            this.boardMatrix.push([]);
            colorBlack = !colorBlack;

            for (let j = 0; j < this.size; j++) {
                const geometry = new PlaneGeometry(1, 1);

                const color = new Color(colorBlack ? BLACK_COLOR_FIELD : WHITE_COLOR_FIELD);
                color.convertSRGBToLinear();

                const material = new MeshPhongMaterial({ color, side: FrontSide });
                const plane = new Mesh(geometry, material);

                plane.userData.ground = true;
                plane.userData.droppable = false;
                plane.userData.chessPosition = { row: i, column: j };

                plane.receiveShadow = true;

                plane.position.set(j - 3.5, 0, i - 3.5);
                plane.rotation.x = -Math.PI / 2;

                plane.name = `${FIELD_NAME}Row${i}Column${j}`;
                this.boardMatrix[i].push(plane.id);

                this.add(plane);
                colorBlack = !colorBlack;
            }
        }
    }

    private createPhysicsBody() {
        this.body = new Body({
            mass: 0,
            shape: new Box(new Vec3(4, 0.05, 4)),
        });
        this.body.position.set(0, -0.05, 0);
    }

    //create board 8x8
    private initChessBase(): void {
        this.chessBase.initModel(this.loader).then((model) => {
            const base = model.scene;
            base.position.set(0, 0, 0);
            base.scale.set(16.5, 16, 16.5);
            this.add(base);
        });
    }

    private static overlayKey(row: number, column: number): string {
        return `${row}_${column}`;
    }

    private createHighlightMesh(type: FieldHighlightType): Mesh {
        const { color, opacity, useCircle } = HIGHLIGHT_STYLES[type];

        const geometry: BufferGeometry = useCircle ? new CircleGeometry(0.19, 20) : new PlaneGeometry(0.94, 0.94);
        const material = new MeshBasicMaterial({
            color,
            transparent: true,
            opacity,
            depthWrite: false
        });

        const mesh = new Mesh(geometry, material);
        mesh.rotation.x = -Math.PI / 2;

        return mesh;
    }

    private addOverlay(
        row: number,
        column: number,
        type: FieldHighlightType,
        overlapMap: Map<string, Mesh>
    ): void {
        const key = ChessBoard.overlayKey(row, column);
        this.removeFromMap(key, overlapMap);

        const mesh = this.createHighlightMesh(type);
        mesh.position.set(column - 3.5, HIGHLIGHT_Y_OFFSET, row - 3.5);
        this.add(mesh)
        overlapMap.set(key, mesh);
    }

    private removeFromMap(key: string, map: Map<string, Mesh>): void {
        const existing = map.get(key);
        if (!existing) return;
        this.remove(existing);
        existing.geometry.dispose();
        (existing.material as Material).dispose();
        map.delete(key);
    }

    private clearMap(map: Map<string, Mesh>): void {
        map.forEach((_, key) => this.removeFromMap(key, map));
        map.clear();
    }


    getFieldId(row: number, column: number): number {
        if (!this.boardMatrix[row]) return -1;
        return this.boardMatrix[row][column];
    }

    getField(row: number, column: number): Object3D | undefined {
        const fieldId = this.getFieldId(row, column);
        if (fieldId === -1) return undefined;
        return this.getObjectById(fieldId);
    }

    markPlaneAsDroppable(row: number, column: number): void {
        const plane = this.getField(row, column) as Mesh | undefined;
        if (plane) plane.userData.droppable = true;
        // Visual highlight can be added here
    }

    clearMarkedPlanes(): void {
        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                const plane = this.getField(i, j) as Mesh | undefined;
                if (plane) {
                    plane.userData.droppable = false;
                }
            }
        }
    }

    /**
    * Highlight a board field with the given visual type.
    *
    * 'check' type uses a separate persistent overlay map so it survives
    * across piece selection / deselection cycles.
    */
    highlightField(row: number, column: number, type: FieldHighlightType): void {
        const map = type === 'check' ? this.stateOverlays : this.selectionOverlays;
        this.addOverlay(row, column, type, map);
    }

    /**
    * Remove all selection-driven overlays (selected square, legal moves, capture targets).
    */
    clearSelectionHighlights(): void {
        this.clearMap(this.selectionOverlays);
    }

    /**
     * Remove the king-in-check highlight. Call this before re-evaluating
     * check state after every move.
     */
    clearCheckHighlight(): void {
        this.clearMap(this.stateOverlays);
    }

    /** Remove every overlay (selection + state). */
    clearAllHighlights(): void {
        this.clearSelectionHighlights();
        this.clearCheckHighlight();
    }

    init(): Body {
        this.createBoardMatrix();
        this.createPhysicsBody();
        this.initChessBase();

        if (!this.body) {
            throw new Error("Physics body was not created");
        }

        return this.body;
    }

    update(): void {
        // Static body — no physics sync needed
    }

    dispose(): void {
        this.clearAllHighlights();
        this.chessBase.dispose();
        super.dispose();
    }
}