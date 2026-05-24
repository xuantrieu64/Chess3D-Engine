import type { Body } from "cannon-es";
import { Group, Material, Mesh, Object3D, Texture, } from "three";

//
function hasMap(material: Material): material is Material & { map: Texture } {
    return "map" in material;
}

export abstract class BaseGroup extends Group {
    body?: Body;

    constructor(name: string) {
        super();
        this.name = name;
    }

    dispose(): void {
        this.traverse((object: Object3D) => {
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