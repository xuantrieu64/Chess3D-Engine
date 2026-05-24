import { Piece } from "../Piece/Piece";
import { PieceOptions } from "../Piece/types";
import BishopModel from "assets/Bishop/Bishop.glb";

export class Bishop extends Piece {
    constructor(name: string, options: PieceOptions) {
        super(name, BishopModel, options);
    }
}