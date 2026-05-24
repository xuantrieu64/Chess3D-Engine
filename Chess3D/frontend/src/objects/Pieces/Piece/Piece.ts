import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { BaseObject } from "@/objects/BaseObject/BaseObject";
import { Body, Box, Quaternion, Vec3 } from "cannon-es";
import { PieceChessPosition, PieceColor, PieceOptions } from "./types";
import { Color, Mesh, MeshPhongMaterial, Vector3 } from "three";
import { BLACK_COLOR_PIECE, WHITE_COLOR_PIECE } from "@/contants/colors";
// import { convertCannonEsQuaternion } from "@/utils/general";

export abstract class Piece extends BaseObject {
    private initialMass = 0.1;
    private size: Vec3 = new Vec3(0.35, 0.4, 0.35);
    private _color: PieceColor;
    private _chessPosition: PieceChessPosition;

    constructor(name: string, model: string | null, options: PieceOptions) {
        super(name, model);
        const { initialChessPosition, color } = options;
        this._chessPosition = initialChessPosition;
        this._color = color;
    }

    private changeMaterial(): void {
        if (!this.model) return;

        const hexColor = this._color === "w" ? WHITE_COLOR_PIECE : BLACK_COLOR_PIECE;

        this.model.scene.traverse((object) => {
            if (!(object instanceof Mesh)) return;

            // Tag every child mesh so raycaster can walk up to the Piece
            object.userData.lastParent = this;
            object.castShadow = true;
            object.receiveShadow = true;

            const color = new Color(hexColor);
            color.convertSRGBToLinear();
            object.material = new MeshPhongMaterial({ color });
        });
    }

    private createPhysicsBody(initialPosition: Vector3): void {
        const bodyPosition = new Vec3(
            initialPosition.x,
            initialPosition.y + this.size.y,   // center of box = surface + half-height
            initialPosition.z
        );

        this.body = new Body({
            mass: this.initialMass,
            position: bodyPosition,
            shape: new Box(this.size),
        });

        // High damping: pieces should settle quickly, not bounce/slide
        this.body.sleepSpeedLimit = 0.1;
        this.body.linearDamping = 0.99;
        this.body.angularDamping = 0.99;
    }


    get chessPosition(): PieceChessPosition {
        return this._chessPosition;
    }

    get color(): PieceColor {
        return this._color;
    }

    changePosition(
        chessPosition: PieceChessPosition,
        worldPosition: Vec3,
        useHeightOffset: boolean = true
    ): void {
        this._chessPosition = chessPosition

        if (!this.body) return

        const { x, y, z } = worldPosition

        // Physics bodies dùng center pivot
        // nên offset = half height
        const heightOffset = useHeightOffset
            ? this.size.y * 0.5
            : 0

        // Reset velocities trước khi teleport
        this.body.velocity.set(0, 0, 0)
        this.body.angularVelocity.set(0, 0, 0)

        // Teleport physics body
        this.body.position.set(
            x,
            y + heightOffset,
            z
        )

        // Không reset quaternion mỗi lần move
        // tránh snap rotation

        this.body.wakeUp()
    }


    changeWorldPosition(x: number, y: number, z: number): void {
        if (!this.body) return;
        this.body.position.set(x, y, z);
        this.body.velocity.set(0, 0, 0);
        this.body.angularVelocity.set(0, 0, 0);
        this.body.wakeUp();
    }

    init(initialPosition: Vector3, loader: GLTFLoader): Body {
        this.initModel(loader)
            .then(() => this.changeMaterial())
            .catch((err) => console.error(`[Piece] GLTF load failed for ${this.name}:`, err));

        this.createPhysicsBody(initialPosition);

        this.scale.set(1, 1, 1);

        return this.body!;
    }

    removeMass(): void {
        if (this.body) this.body.mass = 0;
    }

    resetMass(): void {
        if (this.body) this.body.mass = this.initialMass;
    }

    update(): void {
        if (!this.body) return

        // Sync mesh với physics body
        this.position.copy(this.body.position as unknown as Vector3)

        this.quaternion.copy(
            this.body.quaternion as unknown as Quaternion
        )
    }
}