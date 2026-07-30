document.addEventListener("DOMContentLoaded", () => {
    // UI Elements
    const canvas = document.getElementById("gl-canvas");
    const playBtn = document.getElementById("play-btn");
    const fileUpload = document.getElementById("file-upload");
    const exportBtn = document.getElementById("export-btn");
    const fileNameDisplay = document.getElementById("file-name");
    const statusSubtext = document.getElementById("status-subtext");
    const statusText = document.getElementById("status-text");
    const recordingBadge = document.getElementById("recording-badge");
    const audioPlayer = document.getElementById("audio-player");

    // State & Media Variables
    let isPlaying = false, isRecording = false;
    let audioSrc = null, recordedVideoUrl = null;
    let audioCtx, analyser, sourceNode;
    let mediaRecorder = null, recordedChunks = [];

    // Three.js Engine Variables
    let scene, camera, renderer, particles;
    let animationFrameId;
    const dataArray = new Uint8Array(128);
    
    // Ein Sof Cartesian Setup
    const streams = [];
    const segments = 100; // Length of the physical ribbon trail
    const zStart = -200;  // Deep vanishing point
    const zEnd = 50;      // Past the camera
    const dummy = new THREE.Object3D(); // Helper for InstancedMesh matrix math

    // The 16 specific vector paths
    const cartesianVectors = [
        // Primary Axes
        [1, 0], [-1, 0], [0, 1], [0, -1],
        // y = x and y = -x
        [1, 1], [-1, -1], [1, -1], [-1, 1],
        // y = x/2 and y = -x/2 (Shallow)
        [2, 1], [-2, -1], [2, -1], [-2, 1],
        // y = 2x and y = -2x (Steep)
        [1, 2], [-1, -2], [1, -2], [-1, 2]
    ];

    // Noir Palette: Stark whites, silvers, and greys
    const noirColors = [
        0xffffff, 0xdddddd, 0xbbbbbb, 0x999999,
        0xeeeeee, 0xcccccc, 0xaaaaaa, 0x888888,
        0xffffff, 0xdddddd, 0xbbbbbb, 0x999999,
        0xeeeeee, 0xcccccc, 0xaaaaaa, 0x888888
    ];

    function initThreeJS() {
        const width = canvas.parentElement.clientWidth;
        const height = canvas.parentElement.clientHeight;

        scene = new THREE.Scene();
        
        // Pure black fog for depth tapering
        scene.fog = new THREE.FogExp2(0x000000, 0.007);

        camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        camera.position.z = 30; // Sit slightly inside the tube end

        renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: true,
            alpha: true, 
            preserveDrawingBuffer: true 
        });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setClearColor(0x000000, 0); 

        // 1. Dynamic Noir Starfield
        const pCount = 1000;
        const pGeo = new THREE.BufferGeometry();
        const pPos = new Float32Array(pCount * 3);
        for (let i = 0; i < pCount * 3; i += 3) {
            pPos[i] = (Math.random() - 0.5) * 300;
            pPos[i + 1] = (Math.random() - 0.5) * 300;
            pPos[i + 2] = (Math.random() - 0.5) * 300 - 50; 
        }
        pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
        const pMat = new THREE.PointsMaterial({
            size: 0.8,
            color: 0xffffff,
            transparent: true,
            opacity: 0.7
        });
        particles = new THREE.Points(pGeo, pMat);
        scene.add(particles);

        // 2. Build the 16 Thick Instanced Mesh Streams
        cartesianVectors.forEach((vec, index) => {
            const length = Math.sqrt(vec[0]*vec[0] + vec[1]*vec[1]);
            const normX = vec[0] / length;
            const normY = vec[1] / length;

            // BoxGeometry replaces lines to create physical thickness and width
            const stringGeo = new THREE.BoxGeometry(0.8, 0.8, 4.0); 
            const stringMat = new THREE.MeshBasicMaterial({
                color: noirColors[index],
                transparent: true,
                opacity: 0.85
            });

            const instancedStream = new THREE.InstancedMesh(stringGeo, stringMat, segments);
            scene.add(instancedStream);

            // The leading "Node"
            const nodeGeo = new THREE.SphereGeometry(1.2, 16, 16);
            const nodeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
            const nodeMesh = new THREE.Mesh(nodeGeo, nodeMat);
            scene.add(nodeMesh);

            streams.push({
                mesh: instancedStream,
                node: nodeMesh,
                dirX: normX,
                dirY: normY,
                history: new Float32Array(segments).fill(0), 
                freqBin: Math.floor((index / 16) * 45) 
            });
        });

        renderScene();

        window.addEventListener("resize", () => {
            const w = canvas.parentElement.clientWidth;
            const h = canvas.parentElement.clientHeight;
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
        });
    }

    function renderScene() {
        animationFrameId = requestAnimationFrame(renderScene);
        const time = Date.now() * 0.001;
        let avgAudio = 0;

        if (analyser && isPlaying) {
            analyser.getByteFrequencyData(dataArray);
            
            // Calculate average pulse for the starfield speed
            for(let i = 0; i < 10; i++) avgAudio += dataArray[i];
            avgAudio = avgAudio / 10 / 255;

            streams.forEach((stream) => {
                for (let j = segments - 1; j > 0; j--) {
                    stream.history[j] = stream.history[j - 1];
                }
                stream.history[0] = dataArray[stream.freqBin] / 255.0;
            });
        } else {
            streams.forEach((stream) => {
                for (let j = segments - 1; j > 0; j--) {
                    stream.history[j] = stream.history[j - 1];
                }
                stream.history[0] *= 0.85; 
            });
        }

        // Calculate 3D Ribbon geometry mapping
        streams.forEach((stream) => {
            let prevX = 0, prevY = 0, prevZ = zStart;

            for (let j = 0; j < segments; j++) {
                const z = zStart + (j / segments) * (zEnd - zStart);
                const audioForce = stream.history[j];
                
                const spreadFactor = Math.pow(j / segments, 1.2) * 35; 
                
                let currentX = stream.dirX * (spreadFactor + (audioForce * 40));
                let currentY = stream.dirY * (spreadFactor + (audioForce * 40));

                const twist = Math.sin(j * 0.08 + time * 2) * audioForce * 0.9;
                const cosT = Math.cos(twist);
                const sinT = Math.sin(twist);
                
                const finalX = currentX * cosT - currentY * sinT;
                const finalY = currentX * sinT + currentY * cosT;

                dummy.position.set(finalX, finalY, z);

                // Align the 3D block to face the previous block, creating a continuous ribbon
                if (j > 0) {
                    dummy.lookAt(prevX, prevY, prevZ);
                } else {
                    dummy.lookAt(finalX, finalY, z + 1);
                }

                // Make the physical width thicker based on the music
                const thickness = 1 + audioForce * 3.5;
                dummy.scale.set(thickness, thickness, 1);

                dummy.updateMatrix();
                stream.mesh.setMatrixAt(j, dummy.matrix);

                prevX = finalX; prevY = finalY; prevZ = z;

                if (j === 0) {
                    stream.node.position.set(finalX, finalY, z);
                    stream.node.scale.setScalar(1 + audioForce * 2);
                }
            }
            stream.mesh.instanceMatrix.needsUpdate = true;
        });

        // Pull the background stars rapidly toward the camera to create forward momentum
        if (particles) {
            const pPositions = particles.geometry.attributes.position.array;
            for (let i = 2; i < pPositions.length; i += 3) {
                pPositions[i] += 0.8 + (avgAudio * 5.0); 
                if (pPositions[i] > 50) {
                    pPositions[i] = -250; 
                    pPositions[i-1] = (Math.random() - 0.5) * 300; 
                    pPositions[i-2] = (Math.random() - 0.5) * 300; 
                }
            }
            particles.geometry.attributes.position.needsUpdate = true;
            particles.rotation.z += 0.0005;
        }

        renderer.render(scene, camera);
    }

    // Audio Pipeline
    function initAudio() {
        if (!audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            audioCtx = new AudioContext();
            analyser = audioCtx.createAnalyser();
            analyser.fftSize = 256;
            analyser.smoothingTimeConstant = 0.7; 
        }

        if (!sourceNode && audioCtx && analyser) {
            try {
                sourceNode = audioCtx.createMediaElementSource(audioPlayer);
                sourceNode.connect(analyser);
                analyser.connect(audioCtx.destination);
            } catch (e) {
                console.error("Audio Routing Error:", e);
            }
        }
    }

    // Canvas Recorder Pipeline
    function startRecording() {
        const stream = canvas.captureStream(60); 
        recordedChunks = [];
        mediaRecorder = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp9" });

        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) recordedChunks.push(e.data);
        };

        mediaRecorder.onstop = () => {
            const blob = new Blob(recordedChunks, { type: "video/webm" });
            recordedVideoUrl = URL.createObjectURL(blob);
            exportBtn.classList.remove("hidden");
        };

        mediaRecorder.start();
        isRecording = true;
        recordingBadge.classList.remove("hidden");
    }

    function stopRecording() {
        if (mediaRecorder && isRecording) {
            mediaRecorder.stop();
            isRecording = false;
            recordingBadge.classList.add("hidden");
        }
    }

    // Event Bindings
    fileUpload.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
            if (audioSrc) URL.revokeObjectURL(audioSrc);
            audioSrc = URL.createObjectURL(file);
            audioPlayer.src = audioSrc;
            fileNameDisplay.textContent = file.name;
            statusSubtext.textContent = "Play to start rendering B-Roll video";
            playBtn.disabled = false;
            
            isPlaying = false;
            playBtn.innerHTML = "&#9654;"; 
            exportBtn.classList.add("hidden");
            if (recordedVideoUrl) URL.revokeObjectURL(recordedVideoUrl);
            recordedVideoUrl = null;
        }
    });

    playBtn.addEventListener("click", async () => {
        if (!audioSrc) return;
        initAudio();
        if (audioCtx.state === "suspended") await audioCtx.resume();

        if (isPlaying) {
            audioPlayer.pause();
            isPlaying = false;
            playBtn.innerHTML = "&#9654;"; 
            statusText.textContent = "DSP: IDLE";
            stopRecording();
        } else {
            audioPlayer.play();
            isPlaying = true;
            playBtn.innerHTML = "&#10074;&#10074;"; 
            statusText.textContent = "DSP: ACTIVE";
            startRecording();
        }
    });

    audioPlayer.addEventListener("ended", () => {
        isPlaying = false;
        playBtn.innerHTML = "&#9654;"; 
        statusText.textContent = "DSP: IDLE";
        stopRecording();
    });

    exportBtn.addEventListener("click", () => {
        if (recordedVideoUrl) {
            const a = document.createElement("a");
            a.style.display = "none";
            a.href = recordedVideoUrl;
            a.download = "Noir_Visualizer_BRoll.webm";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    });

    initThreeJS();
});