let scene, camera, renderer, starGeo, starField;
let audioCtx, analyser;
let mediaRecorder, recordedChunks = [];
let streams = [];

const canvas = document.getElementById('visualizer-canvas');
const audioPlayer = document.getElementById('audio-player');
const audioInput = document.getElementById('audio-input');
const playBtn = document.getElementById('play-btn');
const downloadBtn = document.getElementById('download-btn');
const fileNameDisplay = document.getElementById('file-name');
const statusText = document.getElementById('status-text');

let isPlaying = false;
let timeOffset = 0;
const STREAM_POINTS = 80;

const noirColors = [
  0xd97706, // Amber
  0xb45309, // Dark Gold
  0x78716c, // Charcoal / Stone
  0x991b1b, // Crimson Accent
  0x44403c  // Slate Dark
];

function initScene() {
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x050505, 0.015);

  camera = new THREE.PerspectiveCamera(60, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
  camera.position.z = 15;

  renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
    preserveDrawingBuffer: true
  });
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambientLight);

  const pointLight = new THREE.PointLight(0xf59e0b, 5, 50);
  pointLight.position.set(0, 0, 10);
  scene.add(pointLight);

  // Background Starfield
  const starCount = 1500;
  starGeo = new THREE.BufferGeometry();
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount * 3; i += 3) {
    starPos[i] = (Math.random() - 0.5) * 120;
    starPos[i + 1] = (Math.random() - 0.5) * 120;
    starPos[i + 2] = (Math.random() - 0.5) * 200 - 50;
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({ size: 0.1, color: 0x888888, transparent: true, opacity: 0.6 });
  starField = new THREE.Points(starGeo, starMat);
  scene.add(starField);

  // Cartesian Angle Rays
  const rayAngles = [
    0, Math.PI,
    Math.PI / 2, -Math.PI / 2,
    Math.PI / 4, Math.PI / 4 + Math.PI,
    -Math.PI / 4, -Math.PI / 4 + Math.PI,
    Math.atan(0.5), Math.atan(0.5) + Math.PI,
    -Math.atan(0.5), -Math.atan(0.5) + Math.PI,
    Math.atan(2), Math.atan(2) + Math.PI,
    -Math.atan(2), -Math.atan(2) + Math.PI
  ];

  streams = [];

  rayAngles.forEach((angle, idx) => {
    const curvePoints = [];
    for (let p = 0; p < STREAM_POINTS; p++) {
      curvePoints.push(new THREE.Vector3(0, 0, 0));
    }

    const colorHex = noirColors[idx % noirColors.length];
    const material = new THREE.MeshStandardMaterial({
      color: colorHex,
      roughness: 0.3,
      metalness: 0.8
    });

    const curve = new THREE.CatmullRomCurve3(curvePoints);
    const tubeGeo = new THREE.TubeGeometry(curve, 30, 0.35, 8, false);
    const mesh = new THREE.Mesh(tubeGeo, material);
    scene.add(mesh);

    streams.push({ mesh, curvePoints, angle });
  });

  animate();
}

function animate() {
  requestAnimationFrame(animate);
  timeOffset += 0.04;

  const dataArray = new Uint8Array(128);
  if (analyser && isPlaying) {
    analyser.getByteFrequencyData(dataArray);
  }

  // Starfield fly-in towards center
  const starPositions = starGeo.attributes.position.array;
  for (let i = 2; i < starPositions.length; i += 3) {
    starPositions[i] -= 0.6;
    if (starPositions[i] < -200) starPositions[i] = 50;
  }
  starGeo.attributes.position.needsUpdate = true;

  // Stream Convergence Loop
  streams.forEach((stream, streamIdx) => {
    const freqIndex = Math.floor((streamIdx / streams.length) * (dataArray.length / 2));
    const audioValue = isPlaying ? dataArray[freqIndex] / 255.0 : 0.1;

    const pts = stream.curvePoints;

    for (let p = STREAM_POINTS - 1; p > 0; p--) {
      pts[p].copy(pts[p - 1]);
    }

    // Lead point on frame boundary
    const maxDist = 25.0 + audioValue * 8.0;
    const waveOffset = Math.sin(timeOffset * 2 + streamIdx) * (audioValue * 2.5);

    const perpAngle = stream.angle + Math.PI / 2;
    const x = Math.cos(stream.angle) * maxDist + Math.cos(perpAngle) * waveOffset;
    const y = Math.sin(stream.angle) * maxDist + Math.sin(perpAngle) * waveOffset;

    pts[0].set(x, y, 10);

    // Converge inward toward center Z depth
    for (let p = 1; p < STREAM_POINTS; p++) {
      const ratio = p / STREAM_POINTS;
      pts[p].x *= 0.95;
      pts[p].y *= 0.95;
      pts[p].z = 10 - ratio * 150;
    }

    const updatedCurve = new THREE.CatmullRomCurve3(pts);
    const newGeo = new THREE.TubeGeometry(updatedCurve, 30, 0.35 + audioValue * 0.4, 8, false);

    stream.mesh.geometry.dispose();
    stream.mesh.geometry = newGeo;
  });

  renderer.render(scene, camera);
}

function setupAudio() {
  if (!audioCtx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioCtx();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;

    const source = audioCtx.createMediaElementSource(audioPlayer);
    source.connect(analyser);
    analyser.connect(audioCtx.destination);
  }
}

function startRecording() {
  const stream = canvas.captureStream(60);
  recordedChunks = [];

  mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });

  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) recordedChunks.push(e.data);
  };

  mediaRecorder.onstop = () => {
    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    downloadBtn.href = url;
    downloadBtn.download = 'noir_stream_broll.webm';
    downloadBtn.style.display = 'inline-block';
    statusText.innerText = 'STATUS: RECORDING COMPLETE';
  };

  mediaRecorder.start();
  statusText.innerText = 'STATUS: RECORDING B-ROLL';
}

audioInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    audioPlayer.src = URL.createObjectURL(file);
    fileNameDisplay.innerText = file.name;
    playBtn.disabled = false;
    downloadBtn.style.display = 'none';
  }
});

playBtn.addEventListener('click', () => {
  setupAudio();
  if (audioCtx.state === 'suspended') audioCtx.resume();

  if (isPlaying) {
    audioPlayer.pause();
    isPlaying = false;
    playBtn.innerText = 'PLAY & RECORD';
    if (mediaRecorder && mediaRecorder.state === 'recording') mediaRecorder.stop();
  } else {
    audioPlayer.play();
    isPlaying = true;
    playBtn.innerText = 'PAUSE & FINISH';
    startRecording();
  }
});

audioPlayer.addEventListener('ended', () => {
  isPlaying = false;
  playBtn.innerText = 'PLAY & RECORD';
  if (mediaRecorder && mediaRecorder.state === 'recording') mediaRecorder.stop();
});

window.addEventListener('resize', () => {
  camera.aspect = canvas.clientWidth / canvas.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);
});

initScene();