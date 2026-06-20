// Kazakhstan Driving Exam Simulator — entry point.
// Wires together the world, the hierarchical car, the driving model, cameras,
// input, the automated examiner (scoring) and the HUD, then runs the main loop.
//
// No build step: imports resolve through the <script type="importmap"> in index.html.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as TWEEN from '@tweenjs/tween.js';

import { buildEnvironment } from './world/environment.js';
import { buildExamGround } from './world/examGround.js';
import { buildOverpass } from './world/overpass.js';
import { buildCar } from './world/car.js';
import { buildTrafficLight } from './world/trafficLight.js';
import { Vehicle } from './vehicle.js';
import { Keyboard } from './input.js';
import { CameraManager } from './cameras.js';
import { Scoring } from './exam/scoring.js';
import { Examiner } from './exam/examiner.js';

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
const overpass = buildOverpass(scene); // hill-start element just after START
const car = buildCar({ color: 0xc62828, tweens });
scene.add(car.group);

// Traffic light governing the north approach of the central intersection.
const trafficLight = buildTrafficLight();
trafficLight.group.position.set(6.1, 0, -7.1);
trafficLight.group.rotation.y = Math.PI; // face the oncoming (south-bound) car
scene.add(trafficLight.group);

const vehicle = new Vehicle(car, examGround.start, overpass);
const cameras = new CameraManager(camera, controls, car.group);

// --- Examiner -------------------------------------------------------------
const scoring = new Scoring();
const examiner = new Examiner(scoring, { vehicle, car, examGround, trafficLight });

// --- Input ----------------------------------------------------------------
const keys = new Keyboard();
let headlightsOn = false;

keys.tap('KeyC', () => { hud.camera.textContent = cameras.next(); });
keys.tap('KeyL', () => { headlightsOn = !headlightsOn; car.setHeadlights(headlightsOn); hud.lights.textContent = headlightsOn ? 'ON' : 'OFF'; });
keys.tap('KeyO', () => car.toggleDoors());
keys.tap('KeyB', () => examiner.toggleSeatbelt());
keys.tap('KeyQ', () => car.setIndicator(car.indicator === 'left' ? 'off' : 'left'));
keys.tap('KeyE', () => car.setIndicator(car.indicator === 'right' ? 'off' : 'right'));
keys.tap('KeyH', () => car.setIndicator(car.indicator === 'hazard' ? 'off' : 'hazard'));
keys.tap('Enter', () => { if (!scoring.isOver) examiner.finish(); });
keys.tap('KeyR', () => {
  vehicle.reset(); examGround.reset(); examiner.reset(); scoring.reset();
  conesHit = 0; car.setIndicator('off');
  result.classList.remove('show');
});

// --- HUD ------------------------------------------------------------------
const hud = {
  speed: document.getElementById('hud-speed'),
  gear: document.getElementById('hud-gear'),
  camera: document.getElementById('hud-camera'),
  lights: document.getElementById('hud-lights'),
  belt: document.getElementById('hud-belt'),
  signal: document.getElementById('hud-signal'),
  penalty: document.getElementById('hud-penalty'),
  time: document.getElementById('hud-time'),
  cones: document.getElementById('hud-cones'),
  viol: document.getElementById('hud-viol'),
};
const promptEl = document.getElementById('prompt');
const result = document.getElementById('result');
const resultVerdict = document.getElementById('result-verdict');
const resultDetail = document.getElementById('result-detail');
hud.camera.textContent = cameras.mode;

let conesHit = 0;
const totalCones = examGround.cones.length;

// Sample points along the car for cone collisions (front / centre / rear).
const COLLIDE_LOCAL = [
  new THREE.Vector3(2.3, 0, 0),
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(-2.3, 0, 0),
];
const _world = new THREE.Vector3();
function checkCones() {
  let newly = 0;
  for (const p of COLLIDE_LOCAL) {
    _world.copy(p);
    car.group.localToWorld(_world);
    newly += examGround.hitTest(_world, 1.0);
  }
  return newly;
}

// --- Resize ---------------------------------------------------------------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Main loop ------------------------------------------------------------
const clock = new THREE.Clock();
let resultShown = false;

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);

  // Driving input.
  const up = keys.down('ArrowUp', 'KeyW');
  const dn = keys.down('ArrowDown', 'KeyS');
  const throttle = up ? 1 : dn ? -1 : 0;
  const steerIn = (keys.down('ArrowLeft', 'KeyA') ? 1 : 0) - (keys.down('ArrowRight', 'KeyD') ? 1 : 0);

  vehicle.update(dt, throttle, steerIn, up && dn);
  car.update(dt);

  const newCones = checkCones();
  conesHit += newCones;
  examiner.reportConeHits(newCones);

  examGround.update(dt);
  trafficLight.update(dt);
  examiner.update(dt);

  tweens.update(performance.now());
  cameras.update();

  updateHud();
  renderer.render(scene, camera);
}

function updateHud() {
  hud.speed.textContent = Math.round(vehicle.speedKmh);
  hud.gear.textContent = vehicle.gear;
  hud.lights.textContent = headlightsOn ? 'ON' : 'OFF';
  hud.belt.textContent = examiner.seatbelt ? 'ON' : 'OFF';
  hud.signal.textContent = ({ left: '◄ left', right: 'right ►', hazard: 'hazard', off: '—' })[car.indicator];
  hud.cones.textContent = `${conesHit} / ${totalCones}`;

  // Penalty total with colour bands.
  hud.penalty.textContent = scoring.total;
  hud.penalty.className = 'big pts' + (scoring.total >= 100 ? ' bad' : scoring.total >= 50 ? ' warn' : '');

  // Timer mm:ss.
  const tl = Math.ceil(examiner.timeLeft);
  hud.time.textContent = `${Math.floor(tl / 60)}:${String(tl % 60).padStart(2, '0')}`;

  // Last violation.
  const lv = scoring.lastViolation;
  hud.viol.textContent = lv ? `−${lv.points}  ${lv.rule}` : '';

  // Centre prompt.
  const showPrompt = examiner.prompt && !scoring.isOver;
  promptEl.textContent = examiner.prompt || '';
  promptEl.classList.toggle('show', !!showPrompt);
  promptEl.classList.toggle('alert', examiner.prompt.startsWith('⚠'));

  // Result overlay (shown once when the exam ends).
  if (scoring.isOver && !resultShown) {
    resultShown = true;
    const passed = scoring.status === 'passed';
    resultVerdict.textContent = passed ? 'PASSED' : 'FAILED';
    resultVerdict.className = 'verdict ' + (passed ? 'pass' : 'fail');
    resultDetail.innerHTML = passed
      ? `Total penalty: <b>${scoring.total}</b> / 100`
      : `Total penalty: <b>${scoring.total}</b><br>Reason: ${scoring.failReason || '—'}`;
    result.classList.add('show');
  }
  if (!scoring.isOver && resultShown) resultShown = false; // after reset
}

animate();

requestAnimationFrame(() => document.getElementById('loading')?.classList.add('hidden'));

window.__sim = { scene, camera, renderer, car, vehicle, examGround, examiner, scoring, trafficLight, THREE };
