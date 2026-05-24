import { Id } from "@/global/types";
import { BaseGroup } from "../BaseGroup/BaseGroup";
import { ChessBase } from "../ChessBase/ChessBase";
// import { DroppableField } from "./types";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { Color, FrontSide, Mesh, MeshPhongMaterial, Object3D, PlaneGeometry } from "three";
import { BLACK_COLOR_FIELD, WHITE_COLOR_FIELD } from "@/contants/colors";
import { Body, Box, Vec3 } from "cannon-es";
// import { centerMiddle, convertCannonEsQuaternion, convertCannonEsVector, convertThreeVector } from "@/utils/general";


export const FIELD_NAME = "Field";

export class ChessBoard extends BaseGroup {
    private size = 8;
    private chessBase: ChessBase;
    private loader: GLTFLoader;

    private boardMatrix: Array<Id[]> = [];

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

    private createPsychicsBody() {
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
        if (!plane) return;
        plane.userData.droppable = true;
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

    init(): Body {
        this.createBoardMatrix();
        this.createPsychicsBody();
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
        this.chessBase.dispose();
        super.dispose();
    }
}