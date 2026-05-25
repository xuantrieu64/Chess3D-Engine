import { AxesHelper, Color, GridHelper, Light, PerspectiveCamera, PointLight, PointLightHelper, Scene, WebGLRenderer } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Vec3, World } from 'cannon-es';
import createCannonDebugger from "cannon-es-debugger";
import { BasicSceneProps, LightOptions } from './types';

export abstract class BasicScene extends Scene {
    private _renderer: WebGLRenderer;

    loader: GLTFLoader;
    camera!: PerspectiveCamera;
    orbitals!: OrbitControls;
    world: World;
    cannonDebugger?: ReturnType<typeof createCannonDebugger>;

    lights: Array<Light> = [];
    lightHelpers: boolean;

    width = window.innerWidth;
    height = window.innerHeight;

    resizeListener!: () => void;

    abstract init(): void;

    constructor(props: BasicSceneProps) {
        super();

        const { renderer, loader, options } = props;
        const { addGridHelper, lightHelpers = false, cannonDebugger } = options;

        this.lightHelpers = lightHelpers;
        this._renderer = renderer;
        this.loader = loader;

        this.setupCamera();

        this.orbitals = new OrbitControls(this.camera, this._renderer.domElement);
        this.orbitals.enableDamping = true;
        this.orbitals.dampingFactor = 0.05;
        this.orbitals.mouseButtons = {};

        this.orbitals.enableZoom = false;
        this.orbitals.target.set(0, 0, 0);

        this.background = new Color(0x1a1a2e);

        this.world = new World({ gravity: new Vec3(0, -9.82, 0) });
        this.world.allowSleep = true;
        this.world.broadphase.useBoundingBoxes = true;

        if (addGridHelper) {
            this.setupGridHelper();
        }

        if (cannonDebugger) {
            this.setupCannonDebugger();
        }

        this.addWindowResizing();

    }

    private addWindowResizing(): void {
        this.resizeListener = () => {
            this.width = window.innerWidth;
            this.height = window.innerHeight;
            this.camera.aspect = this.width / this.height;
            this.camera.updateProjectionMatrix()
        }
        window.addEventListener("resize", this.resizeListener, false);
    }

    cleanup(): void {
        window.removeEventListener("resize", this.resizeListener);
        this.orbitals.dispose();
    }

    setupCamera(): void {
        this.camera = new PerspectiveCamera(35, this.width / this.height, 0.1, 1000);
        this.camera.position.set(0, 11, 8);
        this.camera.lookAt(0, 0, 0);
    }

    setupGridHelper(): void {
        this.add(new GridHelper(10, 10, "red"));
        this.add(new AxesHelper(3));
    }

    setupCannonDebugger(): void {
        this.cannonDebugger = createCannonDebugger(this, this.world);
    }

    setupLight(options: LightOptions): void {
        const { color, intensity, lookAt, position, castShadow } = options;

        const light = new PointLight(color, intensity);
        light.position.copy(position);
        light.shadow.bias = 0.0001;
        light.shadow.mapSize.width = 1024 * 2;
        light.shadow.mapSize.height = 1024 * 2;

        if (castShadow) {
            light.castShadow = true;
        }

        if (lookAt) {
            light.lookAt(lookAt);
        }
        this.add(light);
        this.lights.push(light);

        if(this.lightHelpers) {
            this.add(new PointLightHelper(light, 0.5, 0xff9900));
        }
    }

    update(): void {
        this.orbitals.update();
        this._renderer.render(this, this.camera);
    }
}