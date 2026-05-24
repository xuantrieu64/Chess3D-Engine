import { PieceColor } from "@/objects/Pieces/Piece/types";
import { PieceSet, PromotablePieces } from "../PiecesContainer/types";
import { OnPromoteBtnClick } from "./types";
import { BLACK_ICONS, WHITE_ICONS } from "@/contants/piece-icon";

export class GameInterface {
    private whiteScoreElementId = "white-score";
    private blackScoreElementId = "black-score";
    private opponentTurnNotificationElementId = "opponent-turn-notification";
    private promotionElementId = "promotion-element-id";
    private promotable: PromotablePieces[] = ["q", "r", "b", "n"];

    private createScoreElement(id: string, isPlayerScore: boolean): void {
        this.getOrCreate(id, (div) => {
            div.classList.add("score");
            div.classList.add(isPlayerScore ? "player-score" : "opponent-score");
            this.styleScoreElement(div, isPlayerScore);
            document.body.appendChild(div);
        })
    }

    private styleScoreElement(el: HTMLElement, isPlayer: boolean): void {
        el.style.position = "fixed";
        el.style.fontSize = "1.5rem";
        el.style.color = "white";
        el.style.zIndex = "100";
        el.style.pointerEvents = "none";
        el.style.userSelect = "none";
        if (isPlayer) {
            el.style.bottom = "12px";
            el.style.left = "50%";
            el.style.transform = "translateX(-50%)";
        } else {
            el.style.top = "12px";
            el.style.left = "50%";
            el.style.transform = "translateX(-50%)";
        }
    }

    private createOpponentTurnNotificationElement(id: string): void {
        this.getOrCreate(id, (div) => {
            div.style.display = "none";
            div.style.position = "fixed";
            div.style.top = "50%";
            div.style.left = "50%";
            div.style.transform = "translate(-50%, -50%)";
            div.style.background = "rgba(0,0,0,0.75)";
            div.style.color = "white";
            div.style.padding = "12px 24px";
            div.style.borderRadius = "8px";
            div.style.fontSize = "1.2rem";
            div.style.zIndex = "200";
            div.style.pointerEvents = "none";
            div.innerHTML = "AI đang suy nghĩ...";
            document.body.appendChild(div);
        })
    }


    private getOrCreate(id: string, factory: (el: HTMLDivElement) => void): HTMLElement {
        let el = document.getElementById(id);
        if (!el) {
            const div = document.createElement("div");
            div.setAttribute("id", id);
            factory(div);
            el = div;
        }
        return el;
    }


    private createPromotionElement(
        id: string,
        playerColor: PieceColor,
        cb: OnPromoteBtnClick
    ): void {
        // Remove any existing promotion dialog
        document.getElementById(id)?.remove();

        const overlay = document.createElement("div");
        overlay.setAttribute("id", id);
        overlay.style.position = "fixed";
        overlay.style.top = "0";
        overlay.style.left = "0";
        overlay.style.width = "100vw";
        overlay.style.height = "100vh";
        overlay.style.display = "flex";
        overlay.style.alignItems = "center";
        overlay.style.justifyContent = "center";
        overlay.style.background = "rgba(0,0,0,0.5)";
        overlay.style.zIndex = "300";

        const container = document.createElement("div");
        container.style.background = "#2d2d2d";
        container.style.borderRadius = "12px";
        container.style.padding = "24px";
        container.style.display = "flex";
        container.style.gap = "12px";

        const icons = playerColor === "w" ? WHITE_ICONS : BLACK_ICONS;

        this.promotable.forEach((pieceType) => {
            const btn = document.createElement("button");
            btn.setAttribute("data-piece-type", pieceType);
            btn.innerHTML = icons[pieceType];
            btn.style.fontSize = "3rem";
            btn.style.background = "none";
            btn.style.border = "2px solid #555";
            btn.style.borderRadius = "8px";
            btn.style.color = "white";
            btn.style.cursor = "pointer";
            btn.style.padding = "8px";
            btn.style.width = "64px";
            btn.style.height = "72px";
            btn.style.transition = "border-color 0.2s";
            btn.onmouseenter = () => { btn.style.borderColor = "#fff" };
            btn.onmouseleave = () => { btn.style.borderColor = "#555" };
            container.appendChild(btn);
        });

        overlay.appendChild(container);
        document.body.appendChild(overlay);

        overlay.onclick = (event: MouseEvent) => {
            if (event.target instanceof Element) {
                const pieceType = event.target.closest("[data-piece-type]")?.getAttribute("data-piece-type") as PromotablePieces | null;
                if (pieceType) {
                    cb(pieceType);
                    overlay.remove();
                }
            }
        }
    }

    private createPromotionButtons(playerColor: PieceColor): HTMLElement {
        const btnContainer = document.createElement("DIV");

        this.promotable.forEach((pieceType: PromotablePieces) => {
            const btn = document.createElement("BUTTON");
            btn.setAttribute("data-piece-type", pieceType);

            btn.classList.add("btn");
            btn.classList.add("promotion");

            btn.innerHTML = playerColor === "w" ? WHITE_ICONS[pieceType] : BLACK_ICONS[pieceType];
            btnContainer.appendChild(btn);
        });

        return btnContainer;
    }

    addToWhiteScore(pieceType: keyof PieceSet): void {
        const el = document.getElementById(this.whiteScoreElementId);
        if (el) el.innerHTML += BLACK_ICONS[pieceType];
    }

    addToBlackScore(pieceType: keyof PieceSet): void {
        const el = document.getElementById(this.blackScoreElementId);
        if (el) el.innerHTML += WHITE_ICONS[pieceType];
    }

    enablePromotionButtons(playerColor: PieceColor, cb: OnPromoteBtnClick): void {
        this.createPromotionElement(this.promotionElementId, playerColor, cb);
    }

    enableOpponentTurnNotification(): void {
        const el = document.getElementById(this.opponentTurnNotificationElementId);
        if (el) {
            el.style.display = "block";
        }
    }

    disableOpponentTurnNotification(): void {
        const el = document.getElementById(this.opponentTurnNotificationElementId);
        if (el) el.style.display = "none";
    }

    init(playerColor: PieceColor): void {
        const isPlayWhiteColor = playerColor === "w";

        this.createScoreElement(this.whiteScoreElementId, isPlayWhiteColor);
        this.createScoreElement(this.blackScoreElementId, !isPlayWhiteColor);
        this.createOpponentTurnNotificationElement(this.opponentTurnNotificationElementId);
    }

    cleanup(): void {
        document.getElementById(this.blackScoreElementId)?.remove();
        document.getElementById(this.whiteScoreElementId)?.remove();
        document.getElementById(this.opponentTurnNotificationElementId)?.remove();
        document.getElementById(this.promotionElementId)?.remove();
    }
}