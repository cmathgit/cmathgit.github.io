import * as THREE from 'three';

// Shared immutable geometry. Materials are separate for each character so
// telegraphs, damage flashes, and phase changes cannot affect other actors.
const GEO = {
    box: new THREE.BoxGeometry(1, 1, 1),
    sphere: new THREE.SphereGeometry(1, 12, 8),
    cylinder: new THREE.CylinderGeometry(1, 1, 1, 10),
    cone: new THREE.ConeGeometry(1, 1, 8),
    ring: new THREE.TorusGeometry(1, 0.045, 6, 40),
    trail: new THREE.TorusGeometry(1, 0.035, 5, 24, Math.PI * 0.8)
};

const clamp = value => THREE.MathUtils.clamp(value, 0, 1);

function smooth(value) {
    const t = clamp(value);
    return t * t * (3 - 2 * t);
}

function between(value, start, end) {
    return smooth((value - start) / Math.max(1, end - start));
}

function joint(parent, name, x = 0, y = 0, z = 0) {
    const object = new THREE.Group();
    object.name = name;
    object.position.set(x, y, z);
    parent.add(object);
    return object;
}

function part(
    parent, geometry, material,
    x, y, z,
    sx, sy, sz,
    shadow = false
) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, sz);
    mesh.castShadow = shadow;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
}

function plate(parent, material, x, y, z, w, h, d, shadow = false) {
    return part(parent, GEO.box, material, x, y, z, w, h, d, shadow);
}

function orb(parent, material, x, y, z, sx, sy = sx, sz = sx) {
    return part(parent, GEO.sphere, material, x, y, z, sx, sy, sz);
}

function ring(parent, material, x, y, z, radius) {
    return part(
        parent, GEO.ring, material,
        x, y, z,
        radius, radius, radius
    );
}

function metal(color, roughness = 0.38) {
    return new THREE.MeshStandardMaterial({
        color,
        metalness: 0.75,
        roughness
    });
}

function energy(color, intensity = 1.7) {
    return new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: intensity,
        metalness: 0.35,
        roughness: 0.3
    });
}

function setEnergy(material, color, intensity) {
    material.color.setHex(color);
    material.emissive.setHex(color);
    material.emissiveIntensity = intensity;
}

function heraldry(parent, light, x, y, z, size = 1) {
    plate(parent, light, x, y, z, 0.035 * size, 0.23 * size, 0.025);
    plate(
        parent, light,
        x, y + 0.035 * size, z,
        0.14 * size, 0.03 * size, 0.025
    );
}

function makeTorso(parent, m, bulky) {
    plate(parent, m.dark, 0, 0.12, 0, 0.43, 0.52, 0.3, true);
    orb(parent, m.armor, 0, 0.18, 0, 0.34 * bulky, 0.29, 0.23);

    for (const side of [-1, 1]) {
        const breastplate = plate(
            parent, m.armor,
            side * 0.17, 0.21, 0.2,
            0.3, 0.25, 0.09,
            true
        );
        breastplate.rotation.z = side * 0.12;

        plate(
            parent, m.trim,
            side * 0.29, 0.15, 0.18,
            0.035, 0.31, 0.035
        );
    }

    for (let i = 0; i < 3; i++) {
        plate(
            parent, m.armor,
            0, -0.04 - i * 0.09, 0.16,
            0.46 - i * 0.035, 0.075, 0.09
        );
    }

    ring(parent, m.trim, 0, 0.23, 0.267, 0.105);
    orb(parent, m.light, 0, 0.23, 0.27, 0.075, 0.075, 0.035);
    heraldry(parent, m.light, 0, -0.03, 0.235, 0.65);

    plate(parent, m.dark, 0, -0.23, 0, 0.5, 0.095, 0.36);
    plate(parent, m.trim, 0, -0.23, 0.2, 0.11, 0.1, 0.04);

    for (const side of [-1, 1]) {
        plate(
            parent, m.dark,
            side * 0.23, 0.14, -0.23,
            0.06, 0.43, 0.04
        );
    }
}

function makeHelmet(parent, m, kind) {
    orb(parent, m.dark, 0, 0, 0, 0.19, 0.22, 0.18);
    orb(parent, m.armor, 0, 0.055, -0.015, 0.215, 0.19, 0.19);

    plate(parent, m.armor, 0, -0.025, 0.16, 0.32, 0.24, 0.065, true);
    plate(parent, m.dark, 0, 0.035, 0.203, 0.29, 0.055, 0.025);
    plate(parent, m.light, 0, 0.035, 0.22, 0.245, 0.018, 0.012);

    plate(parent, m.trim, 0, -0.065, 0.21, 0.035, 0.17, 0.025);

    for (const side of [-1, 1]) {
        plate(parent, m.armor, side * 0.19, -0.04, 0, 0.06, 0.22, 0.2);
    }

    if (kind === 'boss') {
        for (let i = 0; i < 7; i++) {
            const angle = i / 7 * Math.PI * 2;
            part(
                parent, GEO.cone, m.trim,
                Math.sin(angle) * 0.2,
                0.25,
                Math.cos(angle) * 0.17,
                0.045, 0.29 + (i % 2) * 0.08, 0.045
            );
        }
    } else if (kind === 'initiate') {
        for (const side of [-1, 1]) {
            const horn = part(
                parent, GEO.cone, m.armor,
                side * 0.18, 0.2, -0.04,
                0.07, 0.25, 0.07
            );
            horn.rotation.z = -side * 0.55;
        }
    } else {
        plate(parent, m.trim, 0, 0.2, -0.015, 0.055, 0.09, 0.3);
    }
}

function makeArm(parent, side, m, bulky) {
    const shoulder = joint(
        parent,
        side < 0 ? 'leftShoulder' : 'rightShoulder',
        side * 0.43 * bulky, 0.36, 0
    );

    orb(shoulder, m.dark, 0, 0, 0, 0.115);

    const pauldron = joint(shoulder, 'pauldron');
    orb(pauldron, m.armor, side * 0.025, 0.055, 0, 0.2 * bulky, 0.15, 0.23);

    plate(
        pauldron, m.trim,
        side * 0.13, 0.01, 0.12,
        0.055, 0.13, 0.16
    );

    plate(
        shoulder, m.armor,
        0, -0.15, 0,
        0.17, 0.27, 0.19,
        true
    );

    const elbow = joint(shoulder, 'elbow', 0, -0.3, 0);
    orb(elbow, m.dark, 0, 0, 0, 0.095);

    plate(elbow, m.armor, 0, -0.12, 0.01, 0.19, 0.24, 0.2, true);
    plate(elbow, m.trim, 0, -0.19, 0.12, 0.17, 0.06, 0.025);
    plate(elbow, m.light, 0, -0.08, 0.12, 0.035, 0.13, 0.02);

    const hand = joint(elbow, 'hand', 0, -0.28, 0);
    plate(hand, m.dark, 0, -0.025, 0, 0.14, 0.12, 0.15);

    for (const dx of [-0.045, 0, 0.045]) {
        plate(hand, m.trim, dx, -0.05, 0.08, 0.025, 0.06, 0.025);
    }

    return { shoulder, elbow, hand, pauldron };
}

function makeLeg(parent, side, m) {
    const hip = joint(parent, 'hip', side * 0.18, -0.035, 0);
    orb(hip, m.dark, 0, 0, 0, 0.115);

    plate(hip, m.armor, 0, -0.18, 0, 0.21, 0.34, 0.24, true);

    const knee = joint(hip, 'knee', 0, -0.38, 0);
    orb(knee, m.dark, 0, 0, 0, 0.1);
    plate(knee, m.trim, 0, 0, 0.13, 0.2, 0.13, 0.075);

    plate(knee, m.armor, 0, -0.18, 0, 0.2, 0.33, 0.23, true);
    plate(knee, m.light, 0, -0.18, 0.13, 0.025, 0.23, 0.02);

    const foot = joint(knee, 'foot', 0, -0.37, 0);
    plate(foot, m.dark, 0, -0.06, 0.07, 0.23, 0.12, 0.39);
    plate(foot, m.armor, 0, -0.025, 0.16, 0.24, 0.1, 0.22, true);

    return { hip, knee, foot };
}

function makeShield(parent, m, heavy) {
    const shield = joint(parent, 'shield', 0, 0.06, 0.17);

    const width = heavy ? 0.7 : 0.55;
    const height = heavy ? 0.95 : 0.75;

    plate(shield, m.trim, 0, 0, 0, width, height, 0.11, true);
    plate(shield, m.armor, 0, 0, 0.07, width - 0.07, height - 0.07, 0.07);

    for (const side of [-1, 1]) {
        plate(
            shield, m.light,
            side * (width / 2 - 0.07), 0, 0.115,
            0.025, height - 0.14, 0.02
        );
    }

    ring(shield, m.trim, 0, 0.05, 0.13, 0.13);
    heraldry(shield, m.light, 0, 0.04, 0.15, 1.2);

    return shield;
}

function makeWeapon(parent, m, kind) {
    const weapon = joint(parent, 'weapon', 0, -0.025, 0.03);
    const length = kind === 'boss' ? 1.6 : kind === 'enforcer' ? 1.3 : 1.15;

    plate(weapon, m.dark, 0, 0, 0.03, 0.075, 0.09, 0.23);
    plate(weapon, m.trim, 0, 0, 0.17, 0.36, 0.08, 0.08);

    plate(
        weapon, m.armor,
        0, 0, 0.23 + length / 2,
        0.12, 0.065, length,
        true
    );

    for (const side of [-1, 1]) {
        plate(
            weapon, m.light,
            side * 0.064, 0, 0.23 + length / 2,
            0.024, 0.035, length
        );
    }

    const tip = part(
        weapon, GEO.cone, m.light,
        0, 0, 0.25 + length,
        0.07, 0.2, 0.035
    );
    tip.rotation.x = Math.PI / 2;

    return weapon;
}

function makeCape(parent, m, boss) {
    const cape = joint(parent, 'cape', 0, 0.37, -0.25);
    const segments = [];
    let anchor = cape;

    for (let i = 0; i < 4; i++) {
        const segment = joint(anchor, `cape-${i}`, 0, i ? -0.23 : 0, 0);

        plate(
            segment, m.cloth,
            0, -0.12, 0,
            (boss ? 0.82 : 0.62) + i * 0.035,
            0.25, 0.035
        );

        for (const side of [-1, 1]) {
            plate(
                segment, boss ? m.aura : m.trim,
                side * ((boss ? 0.82 : 0.62) + i * 0.035) * 0.46,
                -0.12, -0.025,
                0.025, 0.24, 0.02
            );
        }

        segments.push(segment);
        anchor = segment;
    }

    return { cape, segments };
}

function makeAppendages(parent, m) {
    const appendages = [];

    for (let i = 0; i < 6; i++) {
        // Local +Z is the firing direction.
        const base = joint(parent, `appendage-${i}`, 0, 0.24, -0.2);
        orb(base, m.trim, 0, 0, 0, 0.1);

        plate(base, m.armor, 0, 0, 0.34, 0.12, 0.13, 0.64);

        const elbow = joint(base, `appendage-elbow-${i}`, 0, 0, 0.66);
        orb(elbow, m.aura, 0, 0, 0, 0.075);

        plate(elbow, m.armor, 0, 0, 0.22, 0.16, 0.16, 0.45);
        plate(elbow, m.aura, 0, 0, 0.46, 0.11, 0.11, 0.055);
        ring(elbow, m.trim, 0, 0, 0.49, 0.11);

        appendages.push({ base, elbow });
    }

    return appendages;
}

function addEnemyArmorLayers(rig) {
    const visuals = rig.equipmentVisuals;
    if (!visuals || visuals.layers.head.initiate_mask) return;

    const sources = {
        head: 'helmet',
        torso: 'breastplate',
        waist: 'belt',
        legs: 'greaves'
    };

    const sets = [
        {
            ids: {
                head: 'initiate_mask',
                torso: 'initiate_vestments',
                waist: 'initiate_sash',
                legs: 'initiate_wrappings'
            },
            armor: 0x382a40,
            trim: 0x76616b,
            glow: 0xff2a5f,
            cloth: 0x3b182b,
            width: 0.91,
            depth: 0.94,
            initiate: true
        },
        {
            ids: {
                head: 'enforcer_helm',
                torso: 'enforcer_cuirass',
                waist: 'enforcer_warbelt',
                legs: 'enforcer_greaves'
            },
            armor: 0x344456,
            trim: 0x9a7956,
            glow: 0xc34a48,
            cloth: 0x251d27,
            width: 1.13,
            depth: 1.12,
            initiate: false
        }
    ];

    for (const set of sets) {
        const palette = new Map();

        for (const key of ['armor', 'dark', 'trim', 'light', 'aura', 'cloth']) {
            const original = rig.materials[key];
            const material = original.clone();

            if (key === 'light' || key === 'aura') {
                material.color.setHex(set.glow);
                material.emissive.setHex(set.glow);
                material.emissiveIntensity = set.initiate ? 1.8 : 1.35;
            } else {
                const color = key === 'armor' ? set.armor
                    : key === 'trim' ? set.trim
                    : key === 'cloth' ? set.cloth
                    : 0x17191f;

                material.color.setHex(color);
                material.roughness = set.initiate ? 0.78 : 0.62;
            }

            palette.set(original, material);
        }

        visuals.damageMaterials.push(
            palette.get(rig.materials.armor)
        );

        for (const [slot, source] of Object.entries(sources)) {
            const id = set.ids[slot];
            const destination = [];
            visuals.layers[slot][id] = destination;

            for (const original of visuals.layers[slot][source]) {
                const copy = original.clone(true);
                copy.name = `${id}-layer`;
                copy.visible = false;
                copy.scale.x *= set.width;
                copy.scale.z *= set.depth;

                copy.traverse(mesh => {
                    if (!mesh.isMesh) return;

                    const originalMaterial = mesh.material;
                    mesh.material = palette.get(originalMaterial)
                        || originalMaterial;

                    // Leave gaps between initiate plates to expose the husk.
                    if (set.initiate &&
                        originalMaterial === rig.materials.armor) {
                        mesh.scale.y *= slot === 'head' ? 0.86 : 0.72;
                        mesh.scale.x *= 0.94;
                    }
                });

                original.parent.add(copy);
                destination.push(copy);
            }
        }

        if (!set.initiate) {
            for (const side of ['left', 'right']) {
                const sign = side === 'left' ? -1 : 1;
                const reinforcement = joint(
                    rig[`${side}Shoulder`],
                    `enforcer-${side}-reinforcement`
                );

                reinforcement.visible = false;
                visuals.layers.torso.enforcer_cuirass.push(reinforcement);

                for (let i = 0; i < 2; i++) {
                    plate(
                        reinforcement,
                        palette.get(rig.materials.armor),
                        sign * (0.025 + i * 0.035),
                        0.1 - i * 0.095,
                        0,
                        0.35, 0.1, 0.39,
                        true
                    );
                }

                plate(
                    reinforcement,
                    palette.get(rig.materials.light),
                    0, 0.105, 0.205,
                    0.23, 0.018, 0.018
                );
            }
        }
    }
}

function addHeraldRewardLayers(rig) {
    const visuals = rig.equipmentVisuals;
    if (!visuals || visuals.layers.head.rahu_ketu_crown) return;

    const palette = {
        armor: metal(0x302c45, 0.35),
        dark: metal(0x11121d, 0.6),
        trim: metal(0xc9a354, 0.3),
        light: energy(0xb87cff, 2.2)
    };

    // Helmet decoration follows the existing animated head joint.
    const crown = joint(rig.head, 'rahu-ketu-crown');
    makeHelmet(crown, palette, 'boss');
    ring(crown, palette.trim, 0, 0.16, -0.12, 0.31);

    for (const side of [-1, 1]) {
        orb(
            crown, palette.light,
            side * 0.19, 0.08, 0.21,
            0.035, 0.025, 0.018
        );
    }

    crown.visible = false;
    visuals.layers.head.rahu_ketu_crown = [crown];

    // Keep rig.weapon itself intact: animations still use the same joint.
    const sword = joint(rig.weapon, 'original-sword-layer');

    for (const child of [...rig.weapon.children]) {
        if (child !== sword) sword.add(child);
    }

    const blade = joint(rig.weapon, 'eclipse-herald-blade-layer');

    plate(blade, palette.dark, 0, 0, 0.03, 0.075, 0.09, 0.23);
    plate(blade, palette.trim, 0, 0, 0.17, 0.44, 0.08, 0.08);

    // Matches the original sword's approximate length and grip.
    plate(blade, palette.armor, 0, 0, 0.805, 0.18, 0.065, 1.15);
    plate(blade, palette.light, 0, 0.04, 0.805, 0.035, 0.018, 1.15);

    for (const side of [-1, 1]) {
        plate(
            blade, palette.trim,
            side * 0.09, 0, 0.78,
            0.025, 0.075, 1.05
        );

        const guard = part(
            blade, GEO.cone, palette.trim,
            side * 0.2, 0, 0.23,
            0.045, 0.22, 0.045
        );
        guard.rotation.x = Math.PI / 2;
    }

    const tip = part(
        blade, GEO.cone, palette.light,
        0, 0, 1.4,
        0.09, 0.2, 0.035
    );
    tip.rotation.x = Math.PI / 2;

    const seal = ring(blade, palette.trim, 0, 0.045, 0.36, 0.12);
    seal.rotation.x = Math.PI / 2;

    blade.visible = false;

    visuals.weaponLayers = {
        sword,
        eclipse_herald_blade: blade
    };

    visuals.damageMaterials.push(palette.armor);
}

function buildPlayerEquipmentLayers(rig) {
    const layers = {
        head: { helmet: [] },
        torso: { breastplate: [], iron: [], siege: [] },
        waist: { belt: [] },
        legs: { greaves: [] }
    };

    // Move only decorative meshes. Animated joints remain in place.
    function collect(parent, destination, predicate = () => true) {
        const group = joint(parent, 'equipment-layer');
        for (const child of [...parent.children]) {
            if (child.isMesh && predicate(child)) group.add(child);
        }
        destination.push(group);
        return group;
    }

    collect(rig.head, layers.head.helmet);

    // The existing belt consists of two meshes at local Y = -0.23.
    collect(
        rig.torso,
        layers.waist.belt,
        mesh => Math.abs(mesh.position.y + 0.23) < 0.001
    );
    collect(rig.hips, layers.waist.belt);
    collect(rig.torso, layers.torso.breastplate);

    for (const side of ['left', 'right']) {
        const shoulder = rig[`${side}Shoulder`];
        collect(shoulder, layers.torso.breastplate);

        const pauldron = shoulder.getObjectByName('pauldron');
        if (pauldron) collect(pauldron, layers.torso.breastplate);

        collect(rig[`${side}Elbow`], layers.torso.breastplate);
        collect(rig[`${side}Hand`], layers.torso.breastplate);

        collect(rig[`${side}Hip`], layers.legs.greaves);
        collect(rig[`${side}Knee`], layers.legs.greaves);
        collect(rig[`${side}Foot`], layers.legs.greaves);
    }

    const iron = {
        armor: metal(0x343639, 0.76),
        trim: metal(0x65534a, 0.7),
        light: energy(0xff4926, 1.8)
    };
    const siege = {
        armor: metal(0x222b36, 0.57),
        trim: metal(0x81715b, 0.6),
        light: energy(0xe5a747, 1.5)
    };

    function variant(id, palette, width, depth) {
        for (const original of layers.torso.breastplate) {
            const copy = original.clone(true);
            copy.name = `${id}-layer`;
            copy.scale.set(width, 1, depth);

            copy.traverse(mesh => {
                if (!mesh.isMesh) return;
                if (mesh.material === rig.materials.armor) {
                    mesh.material = palette.armor;
                } else if (mesh.material === rig.materials.trim) {
                    mesh.material = palette.trim;
                } else if (
                    mesh.material === rig.materials.light ||
                    mesh.material === rig.materials.aura
                ) {
                    mesh.material = palette.light;
                }
            });

            original.parent.add(copy);
            layers.torso[id].push(copy);
        }

        const chest = joint(rig.torso, `${id}-reinforcement`);
        layers.torso[id].push(chest);

        for (const sign of [-1, 1]) {
            for (let i = 0; i < 3; i++) {
                const slab = plate(
                    chest, palette.armor,
                    sign * 0.18, 0.29 - i * 0.13, 0.29,
                    id === 'siege' ? 0.38 : 0.3,
                    0.115, id === 'siege' ? 0.16 : 0.1,
                    true
                );
                slab.rotation.z = sign * 0.07;
                plate(
                    chest, palette.light,
                    sign * 0.18, 0.245 - i * 0.13, 0.38,
                    0.23, 0.012, 0.018
                );
            }

            const shoulder = joint(
                sign < 0 ? rig.leftShoulder : rig.rightShoulder,
                `${id}-shoulder`
            );
            layers.torso[id].push(shoulder);

            for (let i = 0; i < (id === 'siege' ? 3 : 2); i++) {
                plate(
                    shoulder, palette.armor,
                    sign * (0.035 + i * 0.035), 0.12 - i * 0.095, 0,
                    id === 'siege' ? 0.43 : 0.32,
                    0.11, id === 'siege' ? 0.48 : 0.35,
                    true
                );
            }

            if (id === 'siege') {
                plate(
                    chest, palette.trim,
                    sign * 0.31, 0.39, 0,
                    0.12, 0.22, 0.39
                );
            }
        }
    }

    variant('iron', iron, 1.09, 1.12);
    variant('siege', siege, 1.22, 1.23);

    const flesh = new THREE.MeshStandardMaterial({
        color: 0x777e79, roughness: 0.83, metalness: 0.05
    });
    const sinew = new THREE.MeshStandardMaterial({
        color: 0x242f32, roughness: 0.55, metalness: 0.12
    });
    const bone = new THREE.MeshStandardMaterial({
        color: 0xc5c8b8, roughness: 0.57, metalness: 0.08
    });
    const shell = new THREE.MeshPhysicalMaterial({
        color: 0xdce1ce,
        roughness: 0.3,
        metalness: 0.05,
        transparent: true,
        opacity: 0.82,
        depthWrite: false,
        clearcoat: 0.7
    });
    const corruption = energy(0x80d6cc, 1.2);
    const husk = { head: [], torso: [], waist: [], legs: [] };

    function bodyGroup(parent, slot) {
        const group = joint(parent, `husk-${slot}`);
        husk[slot].push(group);
        return group;
    }

    function tendon(parent, x, y, z, length, radius = 0.022) {
        return orb(parent, sinew, x, y, z, radius, length / 2, radius);
    }

    const skull = bodyGroup(rig.head, 'head');
    orb(skull, flesh, 0, 0, -0.025, 0.155, 0.225, 0.145);
    orb(skull, shell, 0, 0.075, -0.025, 0.174, 0.19, 0.153);
    orb(skull, bone, 0, -0.055, 0.1, 0.12, 0.15, 0.06);
    plate(skull, sinew, 0, -0.015, 0.162, 0.018, 0.19, 0.012);
    plate(skull, corruption, 0, 0.035, 0.17, 0.007, 0.085, 0.008);

    for (const sign of [-1, 1]) {
        tendon(skull, sign * 0.085, -0.12, 0.08, 0.19);
    }

    const chest = bodyGroup(rig.torso, 'torso');
    orb(chest, flesh, 0, 0.08, 0, 0.235, 0.29, 0.155);
    tendon(chest, 0, 0.09, -0.155, 0.53, 0.035);
    orb(chest, corruption, 0, 0.2, 0.145, 0.045, 0.09, 0.025);

    for (const sign of [-1, 1]) {
        for (let i = 0; i < 5; i++) {
            const rib = orb(
                chest, bone,
                sign * (0.115 - i * 0.009), 0.3 - i * 0.075, 0.12,
                0.145 - i * 0.012, 0.022, 0.065
            );
            rib.rotation.z = sign * (0.18 + i * 0.035);
        }
        orb(chest, shell, sign * 0.19, 0.31, -0.015, 0.085, 0.12, 0.16);
        tendon(chest, sign * 0.075, -0.13, 0.13, 0.22);
    }

    const pelvis = bodyGroup(rig.hips, 'waist');
    orb(pelvis, sinew, 0, -0.06, 0, 0.2, 0.16, 0.13);
    orb(pelvis, bone, 0, -0.08, 0.11, 0.105, 0.12, 0.045);

    for (const sign of [-1, 1]) {
        orb(pelvis, shell, sign * 0.16, -0.035, 0, 0.065, 0.12, 0.13);
        const scrap = plate(
            pelvis, rig.materials.cloth,
            sign * 0.12, -0.22, 0.135,
            0.09, 0.24, 0.022
        );
        scrap.rotation.z = sign * 0.17;
    }

    for (const side of ['left', 'right']) {
        const upper = bodyGroup(rig[`${side}Shoulder`], 'torso');
        orb(upper, flesh, 0, -0.1, 0, 0.085, 0.19, 0.09);
        orb(upper, shell, 0, 0.02, -0.015, 0.11, 0.1, 0.105);
        tendon(upper, 0, -0.15, 0.08, 0.26);

        const forearm = bodyGroup(rig[`${side}Elbow`], 'torso');
        orb(forearm, bone, 0, 0, 0, 0.073);
        orb(forearm, flesh, 0, -0.13, 0, 0.07, 0.14, 0.075);
        tendon(forearm, 0.04, -0.12, 0.055, 0.25);

        const hand = bodyGroup(rig[`${side}Hand`], 'torso');
        orb(hand, flesh, 0, -0.03, 0, 0.064, 0.075, 0.06);
        for (const x of [-0.04, 0, 0.04]) {
            orb(hand, bone, x, -0.085, 0.035, 0.015, 0.055, 0.019);
        }

        const thigh = bodyGroup(rig[`${side}Hip`], 'legs');
        orb(thigh, flesh, 0, -0.17, 0, 0.085, 0.2, 0.095);
        orb(thigh, shell, 0, -0.12, -0.045, 0.09, 0.14, 0.065);
        tendon(thigh, 0, -0.19, 0.085, 0.32);

        const shin = bodyGroup(rig[`${side}Knee`], 'legs');
        orb(shin, bone, 0, 0, 0.025, 0.075, 0.08, 0.085);
        orb(shin, flesh, 0, -0.19, 0, 0.065, 0.18, 0.07);
        tendon(shin, -0.035, -0.18, 0.055, 0.33);
        tendon(shin, 0.035, -0.18, 0.055, 0.33);

        const foot = bodyGroup(rig[`${side}Foot`], 'legs');
        orb(foot, flesh, 0, -0.045, 0.06, 0.085, 0.075, 0.16);
        for (const x of [-0.06, 0, 0.06]) {
            orb(foot, bone, x, -0.07, 0.19, 0.025, 0.035, 0.095);
        }
    }

    rig.equipmentVisuals = {
        layers,
        husk,
        corruption,
        damageMaterials: [iron.armor, siege.armor, bone],
        current: Object.create(null)
    };

    addEnemyArmorLayers(rig);
    addHeraldRewardLayers(rig);
}

export function applyPlayerEquipmentVisuals(rig, inventory) {
    const visuals = rig.equipmentVisuals;
    if (!visuals || !inventory?.equipped) return;

    const equipped = inventory.equipped;

    for (const slot of ['head', 'torso', 'waist', 'legs']) {
        const id = equipped[slot] || null;
        if (visuals.current[slot] === id) continue;

        visuals.current[slot] = id;
        for (const [item, groups] of Object.entries(visuals.layers[slot])) {
            for (const group of groups) group.visible = item === id;
        }

        const armored = Boolean(id && visuals.layers[slot][id]);
        for (const group of visuals.husk[slot]) {
            group.visible = !armored || id.startsWith('initiate_');
        }
    }

    rig.cape.visible = Boolean(equipped.torso);
    rig.shield.visible = equipped.offhand === 'shield';

    const weaponLayers = visuals.weaponLayers;

    if (weaponLayers) {
        for (const [id, group] of Object.entries(weaponLayers)) {
            group.visible = equipped.weapon === id;
        }

        rig.weapon.visible = Object.prototype.hasOwnProperty.call(
            weaponLayers,
            equipped.weapon
        );
    } else {
        rig.weapon.visible = equipped.weapon === 'sword';
    }

    if (!rig.weapon.visible) rig.trail.visible = false;
}

// Compatible with the original makeRig(color, glow, scale) signature.
// The optional fourth argument selects a deliberate character variant.
export function makeRig(
    color = 0x8393a5,
    glow = 0xffd700,
    scale = 1,
    kind = scale > 1.4 ? 'boss' : 'player'
) {
    const boss = kind === 'boss';
    const bulky = boss ? 1.2 : kind === 'enforcer' ? 1.17 : 1;

    const m = {
        armor: metal(boss ? 0x444052 : color),
        dark: metal(0x141923, 0.65),
        trim: metal(boss ? 0xb79758 : 0xa79b77),
        light: energy(glow),
        aura: energy(boss ? 0xc9984e : glow, 1.2),
        cloth: new THREE.MeshStandardMaterial({
            color: boss ? 0x392036 : kind === 'player' ? 0x213447 : 0x3b182b,
            roughness: 0.94,
            metalness: 0
        })
    };

    const root = new THREE.Group();
    root.name = `procedural-${kind}`;
    root.scale.setScalar(scale);

    const pivot = joint(root, 'pivot', 0, 0.95, 0);
    const hips = joint(pivot, 'hips');
    const torso = joint(hips, 'torso', 0, 0.1, 0);

    makeTorso(torso, m, bulky);

    const head = joint(torso, 'head', 0, 0.59, 0);
    makeHelmet(head, m, kind);

    const left = makeArm(torso, -1, m, bulky);
    const right = makeArm(torso, 1, m, bulky);
    const leftLeg = makeLeg(hips, -1, m);
    const rightLeg = makeLeg(hips, 1, m);

    const shield = makeShield(left.hand, m, kind === 'enforcer');
    shield.visible = kind === 'player' || kind === 'enforcer';

    const weapon = makeWeapon(right.hand, m, kind);
    const cape = makeCape(torso, m, boss);

    // Split front cloth panels.
    for (const side of [-1, 1]) {
        const panel = plate(
            hips, m.cloth,
            side * 0.13, -0.22, 0.17,
            0.2, 0.4, 0.045
        );
        panel.rotation.z = side * 0.09;
    }

    const flask = joint(left.hand, 'flask', 0, -0.03, 0.12);
    orb(flask, m.aura, 0, 0, 0, 0.07, 0.1, 0.07);
    plate(flask, m.trim, 0, 0.09, 0, 0.07, 0.04, 0.07);
    flask.visible = false;

    const trailMaterial = new THREE.MeshBasicMaterial({
        color: glow,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });

    const trail = part(
        pivot, GEO.trail, trailMaterial,
        0, 0.15, 0,
        1.45, 1.45, 1.45
    );
    trail.rotation.x = Math.PI / 2;
    trail.visible = false;

    const halos = [];
    const floatingArmor = [];

    if (boss) {
        for (const radius of [0.65, 0.85]) {
            const halo = ring(torso, m.aura, 0, 0.45, -0.4, radius);
            halos.push(halo);
        }

        for (const side of [-1, 1]) {
            for (let i = 0; i < 2; i++) {
                const armor = joint(
                    torso, 'floating-armor',
                    side * (0.65 + i * 0.17),
                    0.4 - i * 0.22,
                    -0.18
                );
                plate(armor, m.armor, 0, 0, 0, 0.21, 0.35, 0.15);
                plate(armor, m.aura, 0, 0, 0.085, 0.035, 0.25, 0.025);
                floatingArmor.push(armor);
            }
        }
    }

    const appendages = boss ? makeAppendages(pivot, m) : [];

    // Record local rest transforms once. Reset poses without allocating
    // new geometry, materials, vectors, or joints during animation.
    const rest = [];

    root.traverse(object => {
        if (object.isGroup && object !== root) {
            rest.push({
                object,
                position: object.position.clone(),
                rotation: object.rotation.clone(),
                scale: object.scale.clone()
            });
        }
    });

    const rig = {
        root,
        pivot,
        hips,
        torso,
        head,
        leftShoulder: left.shoulder,
        rightShoulder: right.shoulder,
        leftElbow: left.elbow,
        rightElbow: right.elbow,
        leftHand: left.hand,
        rightHand: right.hand,
        leftHip: leftLeg.hip,
        rightHip: rightLeg.hip,
        leftKnee: leftLeg.knee,
        rightKnee: rightLeg.knee,
        leftFoot: leftLeg.foot,
        rightFoot: rightLeg.foot,

        // Original API aliases.
        leftArm: left.shoulder,
        rightArm: right.shoulder,
        leftLeg: leftLeg.hip,
        rightLeg: rightLeg.hip,
        light: m.light,

        weapon,
        shield,
        flask,
        cape: cape.cape,
        capeSegments: cape.segments,
        halos,
        floatingArmor,
        appendages,
        trail,
        materials: m,
        rest,
        kind,
        glow,
        previousState: '',
        stateStarted: 0,
        previousHP: null,
        damagedAt: -Infinity
    };

    for (const [index, item] of appendages.entries()) {
        item.base.visible = index < 2;
    }

    if (kind === 'player') {
        buildPlayerEquipmentLayers(rig);
    }

    return rig;
}

export function resetRig(rig) {
    for (const entry of rig.rest) {
        entry.object.position.copy(entry.position);
        entry.object.rotation.copy(entry.rotation);
        entry.object.scale.copy(entry.scale);
    }

    rig.flask.visible = false;
    rig.trail.visible = false;
}

// The weapon crosses its active swing during the existing hit window.
// Visual sampling does not change combat frames or damage calculation.
function swingPose(rig, frame, at, active, end, heavy = false, reverse = false, start = 0) {
    const windup = between(frame, start, at);
    const strike = between(frame, at, at + active);
    const recover = between(frame, at + active, end);
    const direction = reverse ? -1 : 1;

    rig.rightArm.rotation.x =
        THREE.MathUtils.lerp(-0.2, heavy ? -2.25 : -0.65, windup);

    rig.rightArm.rotation.y = -direction * 1.2 * windup;
    rig.rightElbow.rotation.x = -0.65 * windup;
    rig.torso.rotation.y = -direction * 0.35 * windup;

    if (frame >= at) {
        rig.rightArm.rotation.x =
            THREE.MathUtils.lerp(heavy ? -2.25 : -0.65, 0.2, strike);

        rig.rightArm.rotation.y =
            direction * THREE.MathUtils.lerp(-1.2, 1.45, strike);

        rig.rightElbow.rotation.x = -0.65 * (1 - strike);
        rig.torso.rotation.y =
            direction * THREE.MathUtils.lerp(-0.35, 0.45, strike);
    }

    if (frame >= at + active) {
        rig.rightArm.rotation.x *= 1 - recover;
        rig.rightArm.rotation.y *= 1 - recover;
        rig.rightElbow.rotation.x *= 1 - recover;
        rig.torso.rotation.y *= 1 - recover;
    }

    rig.leftArm.rotation.x = -0.3;
    rig.leftElbow.rotation.x = -0.4;

    rig.trail.visible = frame >= at && frame < at + active;
    rig.trail.rotation.set(
        Math.PI / 2,
        0,
        direction * (-1.1 + strike * 2.4)
    );
}

export function animateRig(rig, actor, game, speed = 0) {
    const time = game.time || 0;
    const state = actor.state || 'idle';
    const frame = actor.frame || 0;
    const m = rig.materials;

    if (rig.previousState !== state) {
        rig.previousState = state;
        rig.stateStarted = time;
    }

    if (Number.isFinite(actor.hp)) {
        if (rig.previousHP !== null && actor.hp < rig.previousHP) {
            rig.damagedAt = time;
        }
        rig.previousHP = actor.hp;
    }

    resetRig(rig);

    if (actor.position) rig.root.position.copy(actor.position);

    const direction = state === 'roll' && actor.rollDirection
        ? actor.rollDirection
        : actor.facing;

    if (direction) {
        rig.root.rotation.y = Math.atan2(direction.x, direction.z);
    }

    const boss = rig.kind === 'boss';
    const phase2 = boss && actor.phase === 2;
    const damageFlash = Math.max(0, 1 - (time - rig.damagedAt) / 0.16);

    m.armor.emissive.setHex(0xff445e);
    m.armor.emissiveIntensity = damageFlash * 0.7;

    let color = phase2 ? 0xb366ff : rig.glow;
    let brightness = 1.6 + Math.sin(time * 3) * 0.18;

    rig.pivot.position.y += Math.sin(time * 2.5) * 0.008;
    rig.torso.rotation.x = Math.sin(time * 2.5) * 0.014;
    rig.head.rotation.y = Math.sin(time * 0.8) * 0.025;
    rig.leftArm.rotation.z = 0.09;
    rig.rightArm.rotation.z = -0.09;
    rig.rightElbow.rotation.x = -0.12;

    const locomotion = (state === 'idle' || state === 'block' || state === 'run')
        && speed > 0.05;

    if (locomotion) {
        const phase = time * (speed > 5 ? 13 : 9);
        const stride = Math.sin(phase);
        const amplitude = Math.min(0.7, 0.25 + speed * 0.065);

        rig.leftHip.rotation.x = stride * amplitude;
        rig.rightHip.rotation.x = -stride * amplitude;
        rig.leftKnee.rotation.x = Math.max(0, -stride) * 0.75;
        rig.rightKnee.rotation.x = Math.max(0, stride) * 0.75;
        rig.leftFoot.rotation.x = -rig.leftKnee.rotation.x * 0.35;
        rig.rightFoot.rotation.x = -rig.rightKnee.rotation.x * 0.35;
        rig.leftArm.rotation.x = -stride * amplitude * 0.45;
        rig.rightArm.rotation.x = stride * amplitude * 0.45;

        rig.pivot.position.y += Math.abs(Math.cos(phase)) * 0.025;
        rig.torso.rotation.x = speed > 5 ? 0.12 : 0.045;
    }

    const shieldEquipped = actor.inventory
        ? actor.inventory.has('shield')
        : rig.kind === 'enforcer';

    rig.shield.visible = shieldEquipped;

    // Enforcers mechanically guard while idle in the existing combat code.
    const guarding = state === 'block' ||
        (rig.kind === 'enforcer' && state === 'idle');

    if (guarding || state === 'parry') {
        rig.leftArm.rotation.x = -0.65;
        rig.leftArm.rotation.z = -0.2;
        rig.leftElbow.rotation.x = -0.95;
        rig.shield.rotation.x = 1.6;
        rig.shield.rotation.y = 0.12;
        rig.rightArm.rotation.x = -0.25;
    }

    if (state === 'parry') {
        const jab = between(frame, 0, 4) * (1 - between(frame, 10, 24));
        rig.leftArm.rotation.y = -0.5 * jab;
        rig.leftElbow.rotation.x += 0.45 * jab;
        brightness = actor.parrying ? 5 : 2;
    }

    if (state === 'roll') {
        const motion = actor.rollTier?.motion || 24;
        const duration = actor.rollTier?.duration || motion + 8;
        const tumble = clamp(frame / motion);
        const tuck = Math.sin(clamp(frame / duration) * Math.PI);

        rig.pivot.rotation.x = tumble * Math.PI * 2;
        rig.pivot.position.y = 0.95 - 0.23 * tuck;
        rig.torso.rotation.x = 0.25 * tuck;
        rig.leftHip.rotation.x = -0.8 * tuck;
        rig.rightHip.rotation.x = -0.8 * tuck;
        rig.leftKnee.rotation.x = 1.3 * tuck;
        rig.rightKnee.rotation.x = 1.3 * tuck;
        rig.leftArm.rotation.x = -0.7;
        rig.rightArm.rotation.x = -0.7;
        rig.leftElbow.rotation.x = -0.9;
        rig.rightElbow.rotation.x = -0.9;

        brightness = actor.invulnerable ? 4.5 : 1.8;
    }

    if (state === 'light') {
        swingPose(rig, frame, 10, 6, 32, false, Boolean(actor.combo));
    } else if (state === 'heavy') {
        swingPose(rig, frame, 24, 8, 58, true);
    } else if (actor.actionable && game.input?.attackHeld) {
        rig.rightArm.rotation.x = -2.15;
        rig.rightArm.rotation.y = -0.4;
        rig.rightElbow.rotation.x = -0.7;
        rig.torso.rotation.y = -0.22;
        brightness += 0.5 + Math.sin(time * 18) * 0.2;
    }

    if (state === 'attack' && actor.moves?.length) {
        let index = actor.moves.findIndex(
            move => frame < move.at + move.active + Math.max(1, move.recovery)
        );

        if (index < 0) index = actor.moves.length - 1;

        const move = actor.moves[index];
        const previous = actor.moves[index - 1];
        const start = previous ? previous.at + previous.active : 0;
        const next = actor.moves[index + 1];

        const end = move.recovery
            ? move.at + move.active + move.recovery
            : next ? next.at : move.at + move.active + 12;

        swingPose(
            rig, frame, move.at, move.active, end,
            move.unblockable, index % 2 === 1, start
        );

        // Keep gold/crimson telegraphs legible during the purple phase.
        if (frame >= move.at - 24 && frame < move.at + move.active) {
            color = move.unblockable ? 0xff174d : 0xffd700;
            brightness = 3.5;
        }

        if (move.unblockable && frame < move.at) {
            rig.pivot.position.y -= 0.15 * between(frame, start, move.at);
        }
    }

    if (state === 'heal' || state === 'deliver') {
        const duration = state === 'heal' ? 75 : 48;
        const lift = between(frame, 0, 18) * (1 - between(frame, duration - 18, duration));

        rig.leftArm.rotation.x = -1.1 * lift;
        rig.leftElbow.rotation.x = -1.2 * lift;
        rig.head.rotation.x = -0.15 * lift;
        rig.shield.visible = false;
        rig.flask.visible = state === 'heal';
        brightness = state === 'heal' && frame >= 38 && frame <= 46 ? 4 : 2;
    }

    if (state === 'stagger' || state === 'guardBreak' || state === 'broken') {
        const broken = state !== 'stagger';
        const flinch = Math.exp(-frame / 15);

        rig.pivot.position.y -= broken ? 0.2 : 0.04;
        rig.torso.rotation.x = broken ? 0.55 : -0.35 * flinch;
        rig.head.rotation.x = 0.25;
        rig.leftHip.rotation.x = -0.28;
        rig.rightHip.rotation.x = -0.28;
        rig.leftKnee.rotation.x = 0.65;
        rig.rightKnee.rotation.x = 0.65;
        rig.leftArm.rotation.x = -0.3;
        rig.rightArm.rotation.x = -0.2;

        if (state === 'broken') {
            color = 0xffd700;
            brightness = 2.6;
        }
    }

    if (state === 'dead') {
        // Player.frame stops advancing after death; use simulation time.
        const collapse = smooth((time - rig.stateStarted) / 0.8);

        rig.pivot.position.y = THREE.MathUtils.lerp(0.95, 0.24, collapse);
        rig.pivot.rotation.z = collapse * Math.PI / 2;
        rig.torso.rotation.x = collapse * 0.2;
        rig.leftKnee.rotation.x = collapse * 0.65;
        rig.rightKnee.rotation.x = collapse * 0.4;
        rig.rightArm.rotation.z = -collapse * 0.35;
        brightness = 1.6 * (1 - collapse) + 0.1;
    }

    // Articulated cloth panels: stable, inexpensive secondary movement.
    for (let i = 0; i < rig.capeSegments.length; i++) {
        const segment = rig.capeSegments[i];

        segment.rotation.x =
            0.08 +
            Math.sin(time * 3.3 - i * 0.7) * 0.045 +
            Math.min(speed, 7) * 0.018;

        segment.rotation.z = Math.sin(time * 2 - i * 0.5) * 0.025;
    }

    if (boss) {
        const transformation = phase2
            ? state === 'transition' ? between(frame, 0, 120) : 1
            : 0;

        setEnergy(
            m.aura,
            phase2 ? 0x9d48ff : 0xc9984e,
            1.25 + transformation * 1.7
        );

        m.cloth.color.setHex(phase2 ? 0x421961 : 0x392036);

        for (let i = 0; i < rig.halos.length; i++) {
            const halo = rig.halos[i];

            halo.rotation.z = time * (i ? -0.3 : 0.2);
            halo.rotation.y = Math.sin(time * 0.6 + i) * 0.18;
            halo.scale.setScalar((i ? 0.85 : 0.65) * (1 + transformation * 0.25));
        }

        for (let i = 0; i < rig.floatingArmor.length; i++) {
            const armor = rig.floatingArmor[i];
            const side = i < 2 ? -1 : 1;

            armor.position.x += side * transformation * 0.18;
            armor.position.y += Math.sin(time * 2 + i) * 0.035 * transformation;
            armor.rotation.z = side * transformation * 0.2;
        }

        for (let i = 0; i < rig.appendages.length; i++) {
            const { base, elbow } = rig.appendages[i];
            const side = i % 2 === 0 ? -1 : 1;

            base.visible = i < 2 || transformation > 0.25;
            base.rotation.y = side * (1.7 + Math.floor(i / 2) * 0.45);
            base.rotation.x = -0.25 + Math.floor(i / 2) * 0.22;
            elbow.rotation.x = Math.sin(time * 2 + i) * 0.1;

            if (state === 'laser') {
                // boss.js uses three radial beams. Aim paired appendages
                // along those directions in the character's local space.
                base.rotation.y =
                    (actor.beamAngle || 0) +
                    (i % 3) * Math.PI * 2 / 3 -
                    rig.root.rotation.y;

                base.rotation.x = i < 3 ? 0.12 : -0.12;
                elbow.rotation.x = 0;
            }
        }

        if (state === 'transition') {
            // boss.js already supplies the vertical levitation offset.
            rig.leftArm.rotation.z = 0.75 * transformation;
            rig.rightArm.rotation.z = -0.75 * transformation;
            rig.head.rotation.x = -0.2 * transformation;
        }

        if (state === 'laser') {
            rig.leftArm.rotation.x = -1.5;
            rig.leftElbow.rotation.x = -0.5;
            rig.head.rotation.x = 0.12;
            brightness = frame >= 60 ? 4.5 : 2.5;
        }
    } else {
        setEnergy(m.aura, rig.glow, brightness);
    }

    setEnergy(m.light, color, brightness);
    rig.trail.material.color.setHex(color);

    if (rig.equipmentVisuals) {
        const visuals = rig.equipmentVisuals;

        for (const material of visuals.damageMaterials) {
            material.emissive.setHex(0xff445e);
            material.emissiveIntensity = damageFlash * 0.7;
        }

        visuals.corruption.emissiveIntensity = brightness * 0.65;
        if (!rig.weapon.visible) rig.trail.visible = false;
    }
}

// Retains the existing constructor/root/ready/update interface.
// No loaders, remote assets, or AnimationMixer are needed.
export class AnimationController {
    constructor(scene, rig) {
        this.scene = scene;
        this.rig = rig;
        this.fallbackRig = rig;
        this.root = rig.root;
        this.ready = true;
        this.failed = false;
        this.state = 'idle';
        this.speed = 1;
        this.time = 0;
    }

    play(state) {
        this.state = state;
    }

    update(dt, state, speed = 1, actor = null, game = null) {
        this.time += dt;
        this.state = state;
        this.speed = speed;

        if (actor && game) {
            animateRig(this.rig, actor, game, speed);
        } else {
            animateRig(
                this.rig,
                { state, frame: Math.floor(this.time * 60) },
                { time: this.time },
                state === 'run' ? speed : 0
            );
        }
    }
}