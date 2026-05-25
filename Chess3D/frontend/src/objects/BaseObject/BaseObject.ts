import type { Body } from "cannon-es";
import { Material, Mesh, Object3D, Texture, } from "three";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

function hasMap(material: Material): material is Material & { map: Texture } {
    return "map" in material;
}

export abstract class BaseObject extends Object3D {
    modelName: string | null;
    model?: GLTF;
    body?: Body;

    constructor(name: string, model: string | null) {
        super();

        this.name = name;
        this.modelName = model;
    }

    initModel(loader: GLTFLoader): Promise<GLTF> {
        return new Promise((resolve, reject) => {
            if (!this.modelName) {
                reject(new Error("Model name is missing"));
                return;
            }

            loader.load(this.modelName, (gltf) => {
                this.model = gltf;

                this.add(gltf.scene);

                resolve(gltf);
            },
                undefined,
                (error) => {
                    console.error("GLTF Load Error:", error);
                    reject(error);
                }
            );
        });
    }

    dispose(): void {
        if (!this.model) return;

        this.model.scene.traverse((object: Object3D) => {
            if (!(object instanceof Mesh)) return;

            object.geometry?.dispose();

            const materials = Array.isArray(object.material) ? object.material : [object.material];

            materials.forEach((material) => {
                if (hasMap(material)) {
                    material.map?.dispose();
                }

                material.dispose();
            });
        });

        this.clear();
    }
}