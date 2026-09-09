import * as THREE from 'three';
import { Capsule } from 'three/addons/math/Capsule.js';
import { Octree } from 'three/addons/math/Octree.js';

export class Physics {
    constructor(staticGeometry) {
        staticGeometry.updateMatrixWorld(true);
        this.octree = new Octree().fromGraphNode(staticGeometry);
    }

    makeBody(position, radius = 0.45, height = 1.8) {
        return {
            radius,
            height,
            position: position.clone(),
            velocity: new THREE.Vector3(),
            grounded: false,
            capsule: new Capsule(
                position.clone().add(new THREE.Vector3(0, radius, 0)),
                position.clone().add(new THREE.Vector3(0, height - radius, 0)),
                radius
            )
        };
    }

    teleport(body, position) {
        body.position.copy(position);
        body.velocity.set(0, 0, 0);
        body.capsule.start.copy(position).y += body.radius;
        body.capsule.end.copy(position).y += body.height - body.radius;
    }

    move(body, horizontalVelocity, dt) {
        body.velocity.x = horizontalVelocity.x;
        body.velocity.z = horizontalVelocity.z;

        // Small substeps reduce tunneling during fast rolls.
        const steps = Math.max(
            1,
            Math.ceil(body.velocity.length() * dt / (body.radius * 0.45))
        );

        const h = dt / steps;

        for (let step = 0; step < steps; step++) {
            body.velocity.y -= 28 * h;
            body.capsule.translate(body.velocity.clone().multiplyScalar(h));
            body.grounded = false;

            for (let iteration = 0; iteration < 5; iteration++) {
                const contact = this.octree.capsuleIntersect(body.capsule);
                if (!contact) break;

                body.capsule.translate(
                    contact.normal.clone().multiplyScalar(contact.depth + 0.00001)
                );

                if (contact.normal.y > 0.55) body.grounded = true;

                const intoSurface = body.velocity.dot(contact.normal);

                if (intoSurface < 0) {
                    body.velocity.addScaledVector(contact.normal, -intoSurface);
                }
            }
        }

        body.position.copy(body.capsule.start);
        body.position.y -= body.radius;
    }

    visible(from, to) {
        const direction = to.clone().sub(from);
        const distance = direction.length();

        if (distance < 0.001) return true;

        const ray = new THREE.Ray(from, direction.normalize());
        const result = this.octree.rayIntersect(ray);

        return !result || result.distance >= distance - 0.08;
    }

    cameraPosition(target, desired) {
        const offset = desired.clone().sub(target);
        const distance = offset.length();
        const ray = new THREE.Ray(target, offset.normalize());
        const hit = this.octree.rayIntersect(ray);

        if (!hit || hit.distance >= distance) return desired;

        return target.clone().addScaledVector(
            offset,
            Math.max(0.2, hit.distance - 0.3)
        );
    }
}