import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const DEFAULT_MODEL = './models/ephesian-remnant.glb';

const CLIP_ALIASES = {
    idle: ['idle', 'standing idle', 'ready idle', 'breathing idle'],
    run: ['run', 'running', 'jog', 'walk', 'walking'],
    roll: ['roll', 'dodge roll', 'dodge', 'evade'],
    light: ['light', 'slash', 'attack', 'sword slash', 'great sword slash'],
    heavy: ['heavy', 'heavy attack', 'charged attack', 'great sword attack'],
    block: ['block', 'guard', 'shield block', 'blocking'],
    parry: ['parry', 'shield bash', 'deflect'],
    heal: ['heal', 'drink', 'potion', 'cast spell', 'prayer'],
    stagger: ['stagger', 'hit reaction', 'damage', 'knockback'],
    dead: ['death', 'die', 'dead']
};

const LOOP_ONCE = new Set(['roll', 'light', 'heavy', 'parry', 'heal', 'stagger', 'dead']);

export class AnimationController {
    constructor(scene, fallbackRig, options = {}) {
        this.scene = scene;
        this.fallbackRig = fallbackRig;
        this.root = fallbackRig.root;
        this.modelUrl = options.modelUrl || DEFAULT_MODEL;
        this.loader = new GLTFLoader();
        this.mixer = null;
        this.actions = new Map();
        this.current = null;
        this.ready = false;
        this.failed = false;
        this.state = 'idle';
        this.speed = 1;

        this.load();
    }

    load() {
        this.loader.load(
            this.modelUrl,
            gltf => this.useModel(gltf),
            undefined,
            error => {
                this.failed = true;
                console.warn(`Could not load ${this.modelUrl}; using procedural rig.`, error);
            }
        );
    }

    useModel(gltf) {
        const model = gltf.scene;
        model.traverse(child => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        model.scale.setScalar(1);
        model.position.set(0, 0, 0);
        model.rotation.set(0, 0, 0);

        this.mixer = new THREE.AnimationMixer(model);
        this.actions.clear();

        for (const clip of gltf.animations) {
            const key = this.resolveClip(clip.name);
            if (!key || this.actions.has(key)) continue;

            const action = this.mixer.clipAction(clip);
            action.enabled = true;
            action.clampWhenFinished = LOOP_ONCE.has(key);

            if (LOOP_ONCE.has(key)) {
                action.setLoop(THREE.LoopOnce, 1);
            }

            this.actions.set(key, action);
        }

        this.scene.remove(this.fallbackRig.root);
        this.root = model;
        this.scene.add(this.root);
        this.ready = true;
        this.play(this.state, 0);
    }

    resolveClip(name) {
        const normalized = name.toLowerCase().replaceAll('_', ' ').replaceAll('-', ' ');

        for (const [state, aliases] of Object.entries(CLIP_ALIASES)) {
            if (aliases.some(alias => normalized.includes(alias))) return state;
        }

        return null;
    }

    play(state, fade = 0.12) {
        this.state = state;

        if (!this.ready) return;

        const action = this.actions.get(state) ||
            (state === 'run' ? this.actions.get('idle') : null) ||
            this.actions.get('idle');

        if (!action || action === this.current) return;

        action.reset();
        action.timeScale = this.speed;
        action.fadeIn(fade).play();

        if (this.current) this.current.fadeOut(fade);
        this.current = action;
    }

    update(dt, state, speed = 1) {
        this.speed = speed;
        this.play(state);

        if (this.current) this.current.timeScale = speed;
        if (this.mixer) this.mixer.update(dt);
    }
}
