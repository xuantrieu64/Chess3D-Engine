import { PieceColor } from "@/objects/Pieces/Piece/types";
import { PieceSet, PromotablePieces } from "../PiecesContainer/types";
import { GameOverInfo, OnPromoteBtnClick } from "./types";
import { BLACK_ICONS, WHITE_ICONS } from "@/contants/piece-icon";


export class GameInterface {
    private readonly whiteScoreElementId = "white-score";
    private readonly blackScoreElementId = "black-score";
    private readonly opponentTurnNotificationElementId = "opponent-turn-notification";
    private readonly promotionElementId = "promotion-element-id";
    private readonly gameOverElementId = "game-over-element-id";
    private readonly promotable: PromotablePieces[] = ["q", "r", "b", "n"];

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

    showGameOver(info: GameOverInfo): void {
        // Idempotent – remove previous overlay if it somehow exists
        document.getElementById(this.gameOverElementId)?.remove();
 
        const overlay = document.createElement("div");
        overlay.id = this.gameOverElementId;
        overlay.style.cssText = [
            "position:fixed", "top:0", "left:0",
            "width:100vw", "height:100vh",
            "display:flex", "align-items:center", "justify-content:center",
            "background:rgba(0,0,0,0.72)",
            "z-index:500",
            "animation:fadeIn 0.35s ease",
        ].join(";");
 
        // Inject keyframe once
        if (!document.getElementById("chess-anim-style")) {
            const style = document.createElement("style");
            style.id = "chess-anim-style";
            style.textContent = `@keyframes fadeIn{from{opacity:0}to{opacity:1}}`;
            document.head.appendChild(style);
        }
 
        const box = document.createElement("div");
        box.style.cssText = [
            "background:linear-gradient(145deg,#1e2640,#2d3560)",
            "border:1px solid rgba(255,255,255,0.12)",
            "border-radius:20px",
            "padding:48px 72px",
            "text-align:center",
            "color:white",
            "box-shadow:0 24px 64px rgba(0,0,0,0.6)",
        ].join(";");
 
        const headline = document.createElement("h1");
        headline.textContent = info.headline;
        headline.style.cssText = "font-size:2.4rem;margin:0 0 12px;font-weight:700;";
 
        const detail = document.createElement("p");
        detail.textContent = info.detail;
        detail.style.cssText = "font-size:1.1rem;color:#b0b8d0;margin:0 0 32px;";
 
        const btn = document.createElement("button");
        btn.textContent = "Chơi lại";
        btn.style.cssText = [
            "background:#4a7bd4", "color:white",
            "border:none", "border-radius:10px",
            "padding:12px 32px", "font-size:1.05rem",
            "cursor:pointer", "transition:background 0.2s",
        ].join(";");
        btn.onmouseenter = () => { btn.style.background = "#5a8be4"; };
        btn.onmouseleave = () => { btn.style.background = "#4a7bd4"; };
        btn.onclick = () => window.location.reload();
 
        box.appendChild(headline);
        if (info.detail) box.appendChild(detail);
        box.appendChild(btn);
        overlay.appendChild(box);
        document.body.appendChild(overlay);
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
        document.getElementById(this.gameOverElementId)?.remove();;
    }
}