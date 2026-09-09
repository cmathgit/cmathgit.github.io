import * as THREE from 'three';

export function createLevel(scene) {
    const solid = new THREE.Group();
    scene.add(solid);

    const stone = new THREE.MeshStandardMaterial({
        color: 0x202738,
        metalness: 0.25,
        roughness: 0.55
    });

    const floorMaterial = new THREE.MeshStandardMaterial({
        color: 0x141b2b,
        metalness: 0.45,
        roughness: 0.26
    });

    const gold = new THREE.MeshStandardMaterial({
        color: 0xffdc83,
        emissive: 0xffb52e,
        emissiveIntensity: 2
    });

    const cyan = new THREE.MeshStandardMaterial({
        color: 0x00f2fe,
        emissive: 0x00b6cc,
        emissiveIntensity: 2
    });

    function box(parent, x, y, z, width, height, depth, material = stone) {
        const mesh = new THREE.Mesh(
            new THREE.BoxGeometry(width, height, depth),
            material
        );

        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        parent.add(mesh);
        return mesh;
    }

    box(solid, 0, -0.5, -7, 30, 1, 76, floorMaterial);
    box(solid, -15, 4, -7, 1, 8, 76);
    box(solid, 15, 4, -7, 1, 8, 76);
    box(solid, 0, 4, -45, 30, 8, 1);
    box(solid, 0, 4, 31, 30, 8, 1);

    for (let z = -38; z <= 24; z += 10) {
        for (const x of [-10, 10]) {
            box(solid, x, 4.5, z, 1.5, 9, 1.5);
            box(scene, x, 9.1, z, 2.2, 0.5, 2.2);

            box(scene, x * 1.44, 4.5, z, 0.12, 4, 2.8, cyan);
            box(scene, x, 1.5, z + 0.79, 0.08, 2.5, 0.06, gold);
        }

        box(scene, 0, 9.2, z, 21, 0.4, 0.8);
    }

    // Center aisle.
    for (let z = -40; z < 29; z += 4) {
        box(scene, -3.7, 0.015, z, 0.035, 0.02, 3.2, gold);
        box(scene, 3.7, 0.015, z, 0.035, 0.02, 3.2, gold);
    }

    const altar = new THREE.Vector3(0, 0, 19);
    box(solid, 0, 0.6, 21, 2.8, 1.2, 1.4);
    box(scene, 0, 2.6, 21, 0.14, 2.4, 0.14, gold);
    box(scene, 0, 2.95, 21, 1.25, 0.14, 0.14, gold);

    const sanctuaryLight = new THREE.PointLight(0xffcd75, 35, 15, 2);
    sanctuaryLight.position.set(0, 3, 19);
    scene.add(sanctuaryLight);

    const hemisphere = new THREE.HemisphereLight(0xa9b9ef, 0x17111b, 1.7);
    scene.add(hemisphere);

    const key = new THREE.DirectionalLight(0xc4d4ff, 2.4);
    key.position.set(8, 20, 8);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -25;
    key.shadow.camera.right = 25;
    key.shadow.camera.top = 45;
    key.shadow.camera.bottom = -45;
    key.shadow.camera.far = 100;
    key.shadow.normalBias = 0.035;
    key.target.position.set(0, 0, -10);
    scene.add(key, key.target);

    const eclipseRing = new THREE.Mesh(
        new THREE.TorusGeometry(3.4, 0.12, 12, 80),
        gold
    );

    eclipseRing.position.set(0, 6, -43.8);
    scene.add(eclipseRing);

    const arenaRing = new THREE.Mesh(
        new THREE.RingGeometry(8.8, 8.9, 96),
        gold
    );

    arenaRing.rotation.x = -Math.PI / 2;
    arenaRing.position.set(0, 0.018, -29);
    scene.add(arenaRing);

    return {
        solid,
        altar,
        spawn: new THREE.Vector3(0, 0.05, 16),
        enemies: [
            { position: new THREE.Vector3(-3, 0.05, 5), kind: 'initiate' },
            { position: new THREE.Vector3(4, 0.05, -2), kind: 'initiate' },
            { position: new THREE.Vector3(0, 0.05, -12), kind: 'enforcer' }
        ],
        bossSpawn: new THREE.Vector3(0, 0.05, -30),

        eclipse(enabled) {
            key.intensity = enabled ? 0.36 : 2.4;
            hemisphere.intensity = enabled ? 0.45 : 1.7;
            scene.fog.color.setHex(enabled ? 0x080613 : 0x101625);
            scene.background.setHex(enabled ? 0x030208 : 0x0d101c);
        }
    };
}