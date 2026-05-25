import { CustomLoadingManager } from "@/logic/LoadingManager/LoadingManager";
import { BasicScene } from "@/scenes/BasicScene/BasicScene";
import { ReinhardToneMapping, SRGBColorSpace, WebGLRenderer } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { GameOptions } from "./types";
import { ChessScene } from "@/scenes/ChessScene/ChessScene";


export class Game {

    private loadingManager!: CustomLoadingManager;
    private loader!: GLTFLoader;
    private renderer!: WebGLRenderer;
    private activeScene: BasicScene | null = null;
    private options: GameOptions;
    private resizeListener!: () => void;

    constructor(options?: GameOptions) {
        this.options = options || {};

    }

    init(): void {
        this.setupLoader();
        this.setupRenderer();
        this.addListenerOnResize();
        this.activeScene = this.createChessScene();
        this.activeScene.init();
    }

    private setupLoader(): void {
        this.loadingManager = new CustomLoadingManager();
        this.loader = new GLTFLoader(this.loadingManager);
    }

    private setupRenderer(): void {
        const canvas = document.getElementById("app") as HTMLCanvasElement | null;
        if (!canvas) {
            throw new Error("[Game] Canvas element #app not found in DOM. Ensure GameComponent renders canvas before calling init().");
        }

        this.renderer = new WebGLRenderer({
            canvas: canvas,
            alpha: false,
            antialias: true,
            powerPreference: "high-performance",
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.toneMapping = ReinhardToneMapping;
        this.renderer.toneMappingExposure = 3;
        this.renderer.outputColorSpace = SRGBColorSpace;
        this.renderer.shadowMap.enabled = true;
        this.renderer.setClearColor(0x1a1a2e);
    }

    private addListenerOnResize(): void {
        this.resizeListener = () => {
            const width = window.innerWidth;
            const height = window.innerHeight;
            this.renderer.setSize(width, height);
        };
        window.addEventListener("resize", this.resizeListener, false);
    }

    private createChessScene(): ChessScene {
        return new ChessScene({
            renderer: this.renderer,
            loader: this.loader,
            options: {
                addGridHelper: this.options.addGridHelper ?? false,
                lightHelpers: this.options.lightHelpers ?? false,
                cannonDebugger: this.options.cannonDebugger ?? false,
            },
        });
    }


    update(): void {
        if (!this.activeScene) return
        try {
            this.activeScene.update()
            this.activeScene.cannonDebugger?.update()
        } catch (e) {
            console.error("[Game] update error:", e)
        }
    }

    cleanup(): void {
        window.removeEventListener("resize", this.resizeListener)
        if (this.activeScene) {
            this.activeScene.cleanup()
            this.activeScene = null
        }
        // Properly destroy WebGL context to prevent memory leaks
        if (this.renderer) {
            this.renderer.dispose()
            this.renderer.forceContextLoss()
        }
    }
}