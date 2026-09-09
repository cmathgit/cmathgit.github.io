import * as THREE from 'three';

export function createRenderer(canvas) {
    const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        powerPreference: 'high-performance'
    });

    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0d101c);
    scene.fog = new THREE.FogExp2(0x101625, 0.024);

    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 160);

    function resize() {
        renderer.setSize(innerWidth, innerHeight);
        camera.aspect = innerWidth / innerHeight;
        camera.updateProjectionMatrix();
    }

    addEventListener('resize', resize);
    resize();

    return { renderer, scene, camera };
}