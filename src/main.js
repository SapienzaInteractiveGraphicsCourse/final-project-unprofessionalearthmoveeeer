// Kazakhstan Driving Exam Simulator — entry point.
// Current scope: the autodrome image on the ground + a drivable car. The exam
// elements (cones, overpass, traffic light, scoring) are paused until the map's
// start point and exercise positions are defined against the real image.
//
// No build step: imports resolve through the <script type="importmap"> in index.html.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as TWEEN from '@tweenjs/tween.js';

import { buildEnvironment } from './world/environment.js';
import { buildExamGround } from './world/examGround.js';
import { buildCar } from './world/car.js';
import { Vehicle } from './vehicle.js';
import { Keyboard } from './input.js';
import { CameraManager } from './cameras.js';

// --- Renderer -------------------------------------------------------------
const container = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
container.appendChild(renderer.domElement);

// --- Scene & camera -------------------------------------------------------
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(-24, 8, 12);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.maxPolarAngle = Math.PI * 0.49;

// --- World ----------------------------------------------------------------
const tweens = new TWEEN.Group();

buildEnvironment(scene);
const examGround = buildExamGround(scene);
const car = buildCar({ color: 0xc62828, tweens });
scene.add(car.group);

const vehicle = new Vehicle(car, examGround.start);
const cameras = new CameraManager(camera, controls, car.group);

// --- Input ----------------------------------------------------------------
const keys = new Keyboard();
let headlightsOn = false;

keys.tap('KeyC', () => { hud.camera.textContent = cameras.next(); });
keys.tap('KeyL', () => { headlightsOn = !headlightsOn; car.setHeadlights(headlightsOn); });
keys.tap('KeyO', () => car.toggleDoors());
keys.tap('Space', () => { vehicle.handbrake = !vehicle.handbrake; });
keys.tap('KeyQ', () => car.setIndicator(car.indicator === 'left' ? 'off' : 'left'));
keys.tap('KeyE', () => car.setIndicator(car.indicator === 'right' ? 'off' : 'right'));
keys.tap('KeyH', () => car.setIndicator(car.indicator === 'hazard' ? 'off' : 'hazard'));
keys.tap('KeyR', () => { vehicle.reset(); car.setIndicator('off'); });

// --- HUD ------------------------------------------------------------------
// Hide the examiner panels for now (no scoring this build).
for (const id of ['exam', 'prompt', 'result']) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
}

const hud = {
  speed: document.getElementById('hud-speed'),
  gear: document.getElementById('hud-gear'),
  camera: document.getElementById('hud-camera'),
  lights: document.getElementById('hud-lights'),
  signal: document.getElementById('hud-signal'),
};
hud.camera.textContent = cameras.mode;

// --- Resize ---------------------------------------------------------------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Main loop ------------------------------------------------------------
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);

  const up = keys.down('ArrowUp', 'KeyW');
  const dn = keys.down('ArrowDown', 'KeyS');
  const throttle = up ? 1 : dn ? -1 : 0;
  const steerIn = (keys.down('ArrowLeft', 'KeyA') ? 1 : 0) - (keys.down('ArrowRight', 'KeyD') ? 1 : 0);

  vehicle.update(dt, throttle, steerIn, up && dn);
  car.update(dt);
  tweens.update(performance.now());
  cameras.update();

  hud.speed.textContent = Math.round(vehicle.speedKmh);
  hud.gear.textContent = vehicle.handbrake ? 'P' : vehicle.gear;
  hud.lights.textContent = headlightsOn ? 'ON' : 'OFF';
  hud.signal.textContent = ({ left: '◄ left', right: 'right ►', hazard: 'hazard', off: '—' })[car.indicator];

  renderer.render(scene, camera);
}

animate();

requestAnimationFrame(() => document.getElementById('loading')?.classList.add('hidden'));

window.__sim = { scene, camera, renderer, car, vehicle, examGround, cameras, THREE };
