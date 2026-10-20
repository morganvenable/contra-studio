import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {RobotBand} from './robot-band.ts';
const matrices=(b:RobotBand)=>{b.group.updateMatrixWorld(true);const result:number[][]=[];b.group.traverse(o=>result.push(o.matrixWorld.elements.slice()));return result;};
test('robot band sits beyond the music end without invading dancer bounds',()=>{for(const length of[4,12,24]){const band=new RobotBand(),floor=new THREE.Box3(new THREE.Vector3(-2,0,-length/2),new THREE.Vector3(2,2.3,length/2));band.setFloorBounds(floor);for(let b=0;b<64;b+=.25){band.update(b,true);assert.ok(band.bounds().max.z<floor.min.z-.45);}band.dispose();}});
test('band animation uses only musical beat and remains deterministic on pause and seek',()=>{const band=new RobotBand();band.update(8.3,true);const first=matrices(band);band.update(43,true);band.update(8.3,true);assert.deepEqual(matrices(band),first);band.update(20,false);const quiet=matrices(band);band.update(22,false);assert.deepEqual(matrices(band),quiet);assert.throws(()=>band.update(NaN,true));band.dispose();band.dispose();assert.equal(band.group.children.length,0);});
