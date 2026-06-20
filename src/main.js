// Kazakhstan Driving Exam Simulator — entry point.
// Wires together the world, the hierarchical car, the driving model, cameras,
// input and HUD, then runs the main animation loop.
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
const tweens = new TWEEN.Group(); // isolated group for our hand-written tweens

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
keys.tap('KeyL', () => { headlightsOn = !headlightsOn; car.setHeadlights(headlightsOn); hud.lights.textContent = headlightsOn ? 'ON' : 'OFF'; });
keys.tap('KeyO', () => { car.toggleDoors(); });
keys.tap('KeyR', () => { vehicle.reset(); examGround.reset(); conesHit = 0; });

// --- HUD ------------------------------------------------------------------
const hud = {
  speed: document.getElementById('hud-speed'),
  gear: document.getElementById('hud-gear'),
  camera: document.getElementById('hud-camera'),
  lights: document.getElementById('hud-lights'),
  cones: document.getElementById('hud-cones'),
};
hud.camera.textContent = cameras.mode;

let conesHit = 0;
const totalCones = examGround.cones.length;

// Sample points along the car (local space) used for cone collisions.
const COLLIDE_LOCAL = [
  new THREE.Vector3(2.3, 0, 0),  // front
  new THREE.Vector3(0, 0, 0),    // centre
  new THREE.Vector3(-2.3, 0, 0), // rear
];
const _world = new THREE.Vector3();

function checkCones() {
  for (const p of COLLIDE_LOCAL) {
    _world.copy(p);
    car.group.localToWorld(_world);
    conesHit += examGround.hitTest(_world, 1.0);
  }
}

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
  const dt = Math.min(clock.getDelta(), 0.05); // clamp big frame gaps

  // Read driving input.
  const throttle = keys.down('ArrowUp', 'KeyW') ? 1 : keys.down('ArrowDown', 'KeyS') ? -1 : 0;
  const steerIn = (keys.down('ArrowLeft', 'KeyA') ? 1 : 0) - (keys.down('ArrowRight', 'KeyD') ? 1 : 0);

  vehicle.update(dt, throttle, steerIn);
  car.update(dt);
  checkCones();
  examGround.update(dt);

  tweens.update(performance.now());
  cameras.update();

  // HUD.
  hud.speed.textContent = Math.round(vehicle.speedKmh);
  hud.gear.textContent = vehicle.gear;
  hud.cones.textContent = `${conesHit} / ${totalCones}`;

  renderer.render(scene, camera);
}

animate();

requestAnimationFrame(() => document.getElementById('loading')?.classList.add('hidden'));

window.__sim = { scene, camera, renderer, car, vehicle, examGround, cameras, THREE };
