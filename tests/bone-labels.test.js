import test from 'node:test';import assert from 'node:assert/strict';
import {boneTranslation,boneOptionLabel} from '../src/bone-labels.js';
test('bone options explain attachment names in Portuguese and preserve original identifiers',()=>{
 assert.equal(boneOptionLabel({name:'SKEL_Pelvis',tag:11816}),'Quadril / bacia · SKEL_Pelvis · 11816');
 assert.match(boneOptionLabel({name:'SKEL_R_Foot',tag:52301}),/Pé — lado direito.*SKEL_R_Foot.*52301/);
 assert.equal(boneTranslation('SKEL_Spine2'),'Tórax / peito');assert.match(boneTranslation('IK_L_Foot'),/Controle de movimento: Pé — lado esquerdo/);
 assert.match(boneTranslation('SKEL_L_Finger12'),/indicador — ponta — lado esquerdo/);assert.match(boneTranslation('FB_R_Eye_000'),/Olho — lado direito/);
 assert.equal(boneOptionLabel({name:'custom_bone',tag:37}),'custom_bone · 37');
});
