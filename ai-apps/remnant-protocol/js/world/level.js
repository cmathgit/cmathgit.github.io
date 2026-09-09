import * as THREE from 'three';

export function createLevel(scene) {
    const solid = new THREE.Group();
    solid.name = 'Cathedral collision';

    const scenery = new THREE.Group();
    scenery.name = 'Cathedral of the False Light';

    scene.add(solid, scenery);

    // Shared geometry and materials keep repeated architecture inexpensive.
    const geometry = {
        box: new THREE.BoxGeometry(1, 1, 1),
        cylinder: new THREE.CylinderGeometry(1, 1, 1, 12),
        cone: new THREE.ConeGeometry(1, 1, 8),
        sphere: new THREE.SphereGeometry(1, 10, 8),
        link: new THREE.TorusGeometry(0.12, 0.025, 4, 8)
    };

    function material(color, metalness = 0.25, roughness = 0.7) {
        return new THREE.MeshStandardMaterial({
            color,
            metalness,
            roughness
        });
    }

    function emissive(color, intensity = 1.8) {
        return new THREE.MeshStandardMaterial({
            color,
            emissive: color,
            emissiveIntensity: intensity,
            metalness: 0.45,
            roughness: 0.38
        });
    }

    const materials = {
        stone: material(0x303748),
        darkStone: material(0x181e2a),
        floor: material(0x242a35, 0.35, 0.48),
        panel: material(0x343c49, 0.4, 0.4),
        metal: material(0x475261, 0.8, 0.35),
        bronze: material(0x8f7543, 0.75, 0.4),
        gold: emissive(0xffc66a, 1.8),
        cyan: emissive(0x45cddd, 1.5),
        violet: emissive(0x9966ff, 2),
        arena: emissive(0xe7bb6b, 1.7),
        window: emissive(0x568fc7, 1.3),
        cloth: material(0x431e36, 0.05, 0.95),
        black: material(0x080b14, 0.5, 0.6)
    };

    // Invisible collision ramps still contribute triangles to the Octree.
    const rampMaterial = new THREE.MeshBasicMaterial({
        colorWrite: false,
        depthWrite: false
    });

    // Static decorative instances are collected by geometry/material pair.
    const batches = new Map();
    const transform = new THREE.Object3D();

    function instance(
        shape,
        surface,
        x, y, z,
        sx = 1, sy = 1, sz = 1,
        rx = 0, ry = 0, rz = 0
    ) {
        const key = `${shape.uuid}:${surface.uuid}`;

        if (!batches.has(key)) {
            batches.set(key, {
                geometry: shape,
                material: surface,
                matrices: []
            });
        }

        transform.position.set(x, y, z);
        transform.rotation.set(rx, ry, rz);
        transform.scale.set(sx, sy, sz);
        transform.updateMatrix();

        batches.get(key).matrices.push(transform.matrix.clone());
    }

    function box(x, y, z, w, h, d, surface = materials.stone, ry = 0) {
        instance(geometry.box, surface, x, y, z, w, h, d, 0, ry, 0);
    }

    function cylinder(x, y, z, radius, height, surface) {
        instance(
            geometry.cylinder,
            surface,
            x, y, z,
            radius, height, radius
        );
    }

    function collisionBox(
        x, y, z, w, h, d,
        surface = materials.stone,
        rx = 0,
        ry = 0
    ) {
        const mesh = new THREE.Mesh(geometry.box, surface);
        mesh.position.set(x, y, z);
        mesh.scale.set(w, h, d);
        mesh.rotation.set(rx, ry, 0);
        mesh.receiveShadow = true;
        solid.add(mesh);
        return mesh;
    }

    function mesh(shape, surface, x, y, z, parent = scenery) {
        const object = new THREE.Mesh(shape, surface);
        object.position.set(x, y, z);
        object.receiveShadow = true;
        parent.add(object);
        return object;
    }

    function beamBetween(a, b, width, surface, depth = width) {
        const direction = new THREE.Vector3().subVectors(b, a);
        const midpoint = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);

        transform.position.copy(midpoint);
        transform.quaternion.setFromUnitVectors(
            new THREE.Vector3(0, 1, 0),
            direction.clone().normalize()
        );
        transform.scale.set(width, direction.length(), depth);
        transform.updateMatrix();

        const key = `${geometry.box.uuid}:${surface.uuid}`;

        if (!batches.has(key)) {
            batches.set(key, {
                geometry: geometry.box,
                material: surface,
                matrices: []
            });
        }

        batches.get(key).matrices.push(transform.matrix.clone());
    }

    function conduit(x, y, z, length, surface = materials.gold, horizontal = false) {
        box(
            x, y, z,
            horizontal ? length : 0.055,
            0.025,
            horizontal ? 0.055 : length,
            surface
        );
    }

    // Segmented pointed arch, in the XY plane.
    function arch(cx, baseY, z, halfWidth, rise, surface = materials.stone) {
        for (const side of [-1, 1]) {
            let previous = new THREE.Vector3(
                cx + side * halfWidth,
                baseY,
                z
            );

            for (let i = 1; i <= 8; i++) {
                const t = i / 8;
                const point = new THREE.Vector3(
                    cx + side * halfWidth * Math.cos(t * Math.PI / 2),
                    baseY + rise * Math.sin(t * Math.PI / 2),
                    z
                );

                beamBetween(previous, point, 0.32, surface, 0.55);
                previous = point;
            }
        }
    }

    function column(x, z) {
        // Major supports belong to collision geometry.
        collisionBox(x, 4.1, z, 1.05, 8.2, 1.05);

        box(x, 0.2, z, 1.55, 0.4, 1.55, materials.darkStone);
        box(x, 0.48, z, 1.3, 0.16, 1.3, materials.bronze);
        box(x, 8.1, z, 1.55, 0.4, 1.55);
        box(x, 8.4, z, 1.9, 0.22, 1.7, materials.bronze);

        for (const offset of [-0.36, 0.36]) {
            cylinder(x + offset, 4.2, z + 0.58, 0.095, 7.3, materials.metal);
        }

        box(x, 3.9, z + 0.6, 0.045, 5.5, 0.04, materials.gold);
    }

    function wall(x, z, width, depth) {
        collisionBox(x, 7.5, z, width, 15, depth, materials.darkStone);
        box(x, 0.3, z, width + 0.08, 0.6, depth + 0.08);
        box(x, 6, z, width + 0.08, 0.25, depth + 0.08, materials.bronze);
        box(x, 12.5, z, width + 0.08, 0.25, depth + 0.08, materials.metal);
    }

    function windowPanel(side, z) {
        const x = side * 14.42;

        box(x, 8.5, z, 0.08, 6.2, 3, materials.window);

        for (const offset of [-1.55, 0, 1.55]) {
            box(
                x - side * 0.08, 8.5, z + offset,
                0.15, 6.5, 0.12, materials.metal
            );
        }

        for (const height of [5.3, 7.5, 9.5, 11.7]) {
            box(
                x - side * 0.09, height, z,
                0.16, 0.13, 3.2, materials.bronze
            );
        }

        // Segmented stained-glass colors.
        for (let i = 0; i < 3; i++) {
            box(
                x - side * 0.06,
                6.3 + i * 1.8,
                z + (i % 2 === 0 ? -0.75 : 0.75),
                0.035, 1.2, 1.15,
                i === 1 ? materials.violet : materials.cyan
            );
        }
    }

    function banner(x, z) {
        box(x, 9, z, 1.8, 0.1, 0.12, materials.bronze);
        box(x, 7.6, z, 1.45, 2.7, 0.065, materials.cloth);
        box(x, 7.6, z + 0.05, 0.08, 1.5, 0.03, materials.gold);
        box(x, 7.9, z + 0.05, 0.7, 0.07, 0.03, materials.gold);

        for (const side of [-1, 1]) {
            box(x + side * 0.68, 7.6, z + 0.045, 0.035, 2.6, 0.025, materials.bronze);
        }
    }

    function chain(x, top, z, length) {
        const count = Math.floor(length / 0.2);

        for (let i = 0; i < count; i++) {
            instance(
                geometry.link,
                materials.metal,
                x, top - i * 0.2, z,
                1, 1, 1,
                0, (i % 2) * Math.PI / 2, 0
            );
        }
    }

    function brazier(x, z) {
        cylinder(x, 0.2, z, 0.48, 0.4, materials.darkStone);
        cylinder(x, 0.85, z, 0.13, 1.1, materials.bronze);
        cylinder(x, 1.42, z, 0.43, 0.18, materials.metal);

        instance(
            geometry.cone, materials.gold,
            x, 1.8, z,
            0.24, 0.7, 0.24
        );

        for (const dx of [-0.3, 0.3]) {
            box(x + dx, 1.6, z, 0.05, 0.5, 0.05, materials.bronze);
        }
    }

    function statue(x, z) {
        box(x, 0.35, z, 1.6, 0.7, 1.4, materials.darkStone);
        box(x, 1.75, z, 0.78, 2.1, 0.6, materials.stone);

        instance(
            geometry.sphere, materials.stone,
            x, 3.1, z,
            0.38, 0.46, 0.35
        );

        for (const side of [-1, 1]) {
            box(x + side * 0.5, 2.1, z, 0.28, 1.2, 0.4, materials.metal);
        }

        box(x, 2, z + 0.43, 0.1, 1.8, 0.12, materials.bronze);
        box(x, 2.4, z + 0.44, 0.6, 0.09, 0.14, materials.gold);
        box(x, 3.13, z + 0.34, 0.28, 0.04, 0.025, materials.cyan);
    }

    function stairs(x) {
        // Ascend toward negative Z, from z=12 to z=4.
        const height = 3;
        const run = 8;
        const width = 2.6;
        const steps = 16;
        const stepDepth = run / steps;

        for (let i = 0; i < steps; i++) {
            const top = height * (i + 1) / steps;
            const z = 12 - (i + 0.5) * stepDepth;

            box(x, top / 2, z, width, top, stepDepth, materials.stone);
            box(
                x, top + 0.012, z + stepDepth / 2 - 0.035,
                width - 0.1, 0.025, 0.06, materials.bronze
            );
        }

        const slope = Math.atan2(height, run);
        const thickness = 0.12;

        // Align the box's upper surface with the sloped walking surface.
        collisionBox(
            x,
            height / 2 - thickness / 2 * Math.cos(slope),
            8 - thickness / 2 * Math.sin(slope),
            width,
            thickness,
            Math.hypot(run, height),
            rampMaterial,
            slope
        );

        // Balcony and raised platform: top surface at y=3.
        collisionBox(x, 2.8, -1, 3.2, 0.4, 10, materials.floor);

        for (const side of [-1, 1]) {
            const railX = x + side * 1.48;
            collisionBox(railX, 3.55, -1, 0.14, 1.1, 10, materials.metal);

            for (let z = -5; z <= 3; z += 2) {
                box(railX, 3.6, z, 0.22, 1.2, 0.22, materials.bronze);
            }

            conduit(railX, 4.12, -1, 10, materials.cyan);
        }

        collisionBox(x, 3.55, -5.9, 3, 1.1, 0.15, materials.metal);

        // Visual handrails alongside the ramp.
        for (const side of [-1, 1]) {
            beamBetween(
                new THREE.Vector3(x + side * 1.25, 1, 12),
                new THREE.Vector3(x + side * 1.25, 4, 4),
                0.09,
                materials.bronze
            );
        }
    }

    function altarStructure() {
        // The interaction anchor stays at (0, 0, 19).
        collisionBox(0, 0.6, 21, 2.8, 1.2, 1.4, materials.stone);
        box(0, 1.24, 21, 3.15, 0.12, 1.65, materials.bronze);
        box(0, 1.33, 21, 2.45, 0.055, 1.05, materials.gold);

        box(0, 2.8, 21, 0.14, 2.8, 0.14, materials.gold);
        box(0, 3.25, 21, 1.35, 0.14, 0.14, materials.gold);

        mesh(
            new THREE.TorusGeometry(2.1, 0.055, 8, 64),
            materials.gold,
            0, 3.2, 23
        );

        arch(0, 2, 24.5, 4.5, 6.8, materials.bronze);

        for (const x of [-4.8, 4.8]) {
            statue(x, 25);
            brazier(x * 0.7, 20.5);
        }

        const sanctuaryRing = mesh(
            new THREE.TorusGeometry(3.5, 0.025, 4, 64),
            materials.gold,
            0, 0.04, 19
        );
        sanctuaryRing.rotation.x = Math.PI / 2;

        for (const x of [-3.1, 3.1]) {
            chain(x, 10, 23.5, 5);
        }
    }

    function arenaDecorations() {
        // Unobstructed circular fighting floor inside the existing bounds.
        const disc = mesh(
            new THREE.CylinderGeometry(11.8, 11.8, 0.018, 64),
            materials.floor,
            0, 0.009, -30
        );
        disc.receiveShadow = true;

        for (const radius of [5.5, 9.4, 11.65]) {
            const ring = mesh(
                new THREE.TorusGeometry(radius, 0.035, 5, 80),
                materials.arena,
                0, 0.035, -30
            );
            ring.rotation.x = Math.PI / 2;
        }

        for (let i = 0; i < 24; i++) {
            const angle = i / 24 * Math.PI * 2;
            const x = Math.sin(angle) * 10.6;
            const z = -30 + Math.cos(angle) * 10.6;

            box(x, 0.035, z, 0.08, 0.025, 0.8, materials.arena, angle);
        }

        // Raised perimeter markers, outside the main combat disc.
        for (const side of [-1, 1]) {
            for (const z of [-24, -32, -40]) {
                box(side * 13.6, 1.5, z, 0.7, 3, 0.9, materials.darkStone);
                box(side * 13.6, 2, z + 0.48, 0.06, 1.6, 0.04, materials.arena);
            }
        }

        // Monument on the rear wall.
        mesh(
            new THREE.CylinderGeometry(3, 3, 0.25, 64),
            materials.black,
            0, 7.3, -44
        ).rotation.x = Math.PI / 2;

        mesh(
            new THREE.TorusGeometry(3.25, 0.11, 10, 80),
            materials.arena,
            0, 7.3, -43.75
        );

        mesh(
            new THREE.TorusGeometry(4, 0.035, 6, 80),
            materials.bronze,
            0, 7.3, -43.8
        );

        for (let i = 0; i < 12; i++) {
            const angle = i * Math.PI / 6;
            instance(
                geometry.box,
                materials.arena,
                Math.sin(angle) * 3.65,
                7.3 + Math.cos(angle) * 3.65,
                -43.7,
                0.08, 0.42, 0.07,
                0, 0, -angle
            );
        }
    }

    // Deterministic clutter: stays away from the central combat route.
    let seed = 66019;

    function random() {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        return seed / 4294967296;
    }

    function debris() {
        for (let i = 0; i < 65; i++) {
            const side = random() > 0.5 ? 1 : -1;
            const x = side * (13.8 + random() * 0.35);
            const z = -42 + random() * 70;
            const size = 0.12 + random() * 0.35;

            instance(
                geometry.box,
                i % 3 === 0 ? materials.metal : materials.stone,
                x, size * 0.35, z,
                size * 1.5, size * 0.7, size,
                random() * 0.25,
                random() * Math.PI,
                random() * 0.25
            );
        }
    }

    // Foundation and original world limits.
    collisionBox(0, -0.5, -7, 30, 1, 76, materials.floor);
    wall(-15, -7, 1, 76);
    wall(15, -7, 1, 76);
    wall(0, -45, 30, 1);
    wall(0, 31, 30, 1);

    // Floor joints and inset slabs leave a clearly readable central path.
    for (let z = -42; z <= 28; z += 4) {
        for (const x of [-6, -2, 2, 6]) {
            box(x, 0.006, z, 3.87, 0.012, 3.87, materials.panel);
        }

        if (z > -18) {
            conduit(-3.7, 0.027, z, 3.2);
            conduit(3.7, 0.027, z, 3.2);
        }
    }

    // Nave structural bays.
    for (const z of [-14, -4, 6, 16, 26]) {
        for (const side of [-1, 1]) {
            column(side * 9, z);
            windowPanel(side, z);

            // Upper buttresses above the side aisles.
            beamBetween(
                new THREE.Vector3(side * 9, 8.4, z),
                new THREE.Vector3(side * 14.3, 11.7, z),
                0.48,
                materials.stone,
                0.8
            );

            banner(side * 7.3, z);
        }

        arch(0, 8.3, z, 9, 5, materials.stone);
        arch(0, 8.45, z + 0.4, 8.8, 4.9, materials.bronze);
    }

    // Roof ribs and high ridge.
    box(0, 13.65, 5, 0.5, 0.45, 47, materials.metal);

    for (const x of [-6, 6]) {
        box(x, 11.95, 5, 0.18, 0.2, 47, materials.bronze);
    }

    // Sanctuary ceiling canopy.
    box(0, 14.3, 22, 29, 0.4, 17, materials.darkStone);

    stairs(-12);
    stairs(12);
    altarStructure();

    for (const x of [-7.3, 7.3]) {
        for (const z of [12, 2, -9]) {
            brazier(x, z);
        }
    }

    // Boss threshold: crosses the existing z < -18 trigger.
    for (const side of [-1, 1]) {
        collisionBox(
            side * 10.8, 4, -18,
            7.4, 8, 0.9,
            materials.darkStone
        );

        box(side * 6.95, 4, -17.48, 0.12, 7.6, 0.08, materials.arena);
        statue(side * 11.2, -16.7);
    }

    arch(0, 7.5, -18, 7, 5, materials.metal);
    arch(0, 7.5, -17.6, 6.7, 4.75, materials.arena);
    conduit(0, 0.03, -18, 13.4, materials.arena, true);

    for (const side of [-1, 1]) {
        windowPanel(side, -27);
        windowPanel(side, -38);
        chain(side * 7.8, 13, -34, 4);
        banner(side * 8, -42.8);
    }

    arenaDecorations();
    debris();

    // Extra eclipse geometry is static and only visible in phase two.
    const phaseEffects = new THREE.Group();
    phaseEffects.name = 'False eclipse';
    phaseEffects.visible = false;
    scenery.add(phaseEffects);

    for (const radius of [4.5, 5.1]) {
        mesh(
            new THREE.TorusGeometry(radius, 0.035, 6, 80),
            materials.violet,
            0, 7.3, -43.5,
            phaseEffects
        );
    }

    for (const side of [-1, 1]) {
        for (const z of [-25, -34, -41]) {
            const spike = mesh(
                new THREE.ConeGeometry(0.22, 3.8, 5),
                materials.violet,
                side * 13.1, 2.6, z,
                phaseEffects
            );
            spike.rotation.z = side * 0.18;
        }
    }

    // Flush decorative instance batches.
    for (const batch of batches.values()) {
        const object = new THREE.InstancedMesh(
            batch.geometry,
            batch.material,
            batch.matrices.length
        );

        batch.matrices.forEach((matrix, index) => {
            object.setMatrixAt(index, matrix);
        });

        object.instanceMatrix.needsUpdate = true;
        object.receiveShadow = true;
        object.castShadow = false;
        object.computeBoundingSphere();
        scenery.add(object);
    }

    // One shadow-casting light; local lights are inexpensive fill lights.
    const hemisphere = new THREE.HemisphereLight(
        0xb4c5ef, 0x26202b, 1.9
    );

    const key = new THREE.DirectionalLight(0xc4d4ff, 2.5);
    key.position.set(8, 20, 8);
    key.target.position.set(0, 0, -10);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -25;
    key.shadow.camera.right = 25;
    key.shadow.camera.top = 45;
    key.shadow.camera.bottom = -45;
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 100;
    key.shadow.normalBias = 0.035;

    const sanctuaryLight = new THREE.PointLight(0xffce86, 65, 20, 2);
    sanctuaryLight.position.set(0, 4, 19);

    const naveLight = new THREE.PointLight(0x72b6ed, 50, 30, 2);
    naveLight.position.set(0, 7, 2);

    const arenaLight = new THREE.PointLight(0xe8be79, 85, 32, 2);
    arenaLight.position.set(0, 7, -30);

    scene.add(
        hemisphere,
        key,
        key.target,
        sanctuaryLight,
        naveLight,
        arenaLight
    );

    function eclipse(enabled) {
        const active = Boolean(enabled);

        key.intensity = active ? 0.45 : 2.5;
        hemisphere.intensity = active ? 0.85 : 1.9;
        hemisphere.color.setHex(active ? 0x9283c3 : 0xb4c5ef);

        naveLight.intensity = active ? 22 : 50;
        arenaLight.color.setHex(active ? 0xae65ff : 0xe8be79);
        arenaLight.intensity = active ? 125 : 85;

        // Keep the sanctuary warm and identifiable in both phases.
        sanctuaryLight.intensity = 65;

        materials.arena.color.setHex(active ? 0xbc83ff : 0xe7bb6b);
        materials.arena.emissive.setHex(active ? 0xa345ff : 0xe7bb6b);
        materials.arena.emissiveIntensity = active ? 3 : 1.7;

        materials.window.color.setHex(active ? 0x72559f : 0x568fc7);
        materials.window.emissive.setHex(active ? 0x72559f : 0x568fc7);
        materials.window.emissiveIntensity = active ? 1.6 : 1.3;

        phaseEffects.visible = active;

        if (!scene.fog) {
            scene.fog = new THREE.FogExp2(0x101625, 0.018);
        }

        scene.fog.color.setHex(active ? 0x140b23 : 0x101625);

        if (scene.fog.isFogExp2) {
            scene.fog.density = active ? 0.029 : 0.018;
        }

        if (scene.background?.isColor) {
            scene.background.setHex(active ? 0x07030e : 0x0d101c);
        } else {
            scene.background = new THREE.Color(
                active ? 0x07030e : 0x0d101c
            );
        }
    }

    eclipse(false);

    return {
        solid,
        altar: new THREE.Vector3(0, 0, 19),
        spawn: new THREE.Vector3(0, 0.05, 16),
        enemies: [
            {
                position: new THREE.Vector3(-3, 0.05, 5),
                kind: 'initiate'
            },
            {
                position: new THREE.Vector3(4, 0.05, -2),
                kind: 'initiate'
            },
            {
                position: new THREE.Vector3(0, 0.05, -12),
                kind: 'enforcer'
            }
        ],
        bossSpawn: new THREE.Vector3(0, 0.05, -30),
        eclipse
    };
}