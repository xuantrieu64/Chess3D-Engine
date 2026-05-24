import ChessBaseModel from "assets/ChessBase/ChessBase.glb";
import { BaseObject } from "../BaseObject/BaseObject";


export class ChessBase extends BaseObject {
    constructor(name: string) {
        super(name, ChessBaseModel);
    }
}