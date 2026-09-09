import * as THREE from 'three';

export class FollowCamera {
    constructor(camera, physics) {
        this.camera = camera;
        this.physics = physics;
        this.yaw = 0;
        this.pitch = 0.32;
        this.focus = new THREE.Vector3();
        this.initialized = false;
        this.zoomTime = 0;
    }

    direction(input) {
        const forward = new THREE.Vector3(
            -Math.sin(this.yaw), 0, -Math.cos(this.yaw)
        );

        const right = new THREE.Vector3(
            Math.cos(this.yaw), 0, -Math.sin(this.yaw)
        );

        return forward.multiplyScalar(
            Number(input.down('KeyW')) - Number(input.down('KeyS'))
        ).addScaledVector(
            right,
            Number(input.down('KeyD')) - Number(input.down('KeyA'))
        ).normalize();
    }

    update(dt, player, target, input) {
        const look = input.look();

        if (target?.alive) {
            const offset = player.position.clone().sub(target.position);
            const wanted = Math.atan2(offset.x, offset.z);
            const delta = Math.atan2(
                Math.sin(wanted - this.yaw),
                Math.cos(wanted - this.yaw)
            );

            this.yaw += delta * (1 - Math.exp(-8 * dt));
        } else {
            this.yaw -= look.x * 0.0025;
            this.yaw += (
                Number(input.down('ArrowLeft')) -
                Number(input.down('ArrowRight'))
            ) * dt * 1.8;
        }

        this.pitch = THREE.MathUtils.clamp(
            this.pitch + look.y * 0.002,
            0.08,
            0.95
        );

        const desiredFocus = player.position.clone();
        desiredFocus.y += 1.25;

        if (target?.alive) {
            const enemyFocus = target.position.clone();
            enemyFocus.y += 1.3;
            desiredFocus.lerp(enemyFocus, 0.22);
        }

        if (!this.initialized) {
            this.focus.copy(desiredFocus);
            this.initialized = true;
        }

        this.focus.lerp(desiredFocus, 1 - Math.exp(-12 * dt));

        const distance = 7;
        const offset = new THREE.Vector3(
            Math.sin(this.yaw) * Math.cos(this.pitch),
            Math.sin(this.pitch),
            Math.cos(this.yaw) * Math.cos(this.pitch)
        ).multiplyScalar(distance);

        const desired = this.focus.clone().add(offset);
        this.camera.position.copy(
            this.physics.cameraPosition(this.focus, desired)
        );

        this.camera.lookAt(this.focus);

        this.zoomTime = Math.max(0, this.zoomTime - dt);
        this.camera.fov = THREE.MathUtils.lerp(
            this.camera.fov,
            this.zoomTime > 0 ? 52 : 60,
            1 - Math.exp(-22 * dt)
        );

        this.camera.updateProjectionMatrix();
    }
}