import * as THREE from '../vendor/three.module.js';

// Reuses the actual scene reflection already rendered for puddles. Its planar
// projection on curved leaves is a restrained stylised approximation, not a cube
// environment or an extra six-pass capture of the forest.
export function createLeafReflections(scene,renderer,resources,reduced,{leafMaterials=[],source=null}={}){
 const safeTexture=new THREE.DataTexture(new Uint8Array([24,35,29,255]),1,1,THREE.RGBAFormat);safeTexture.needsUpdate=true;resources.textures?.push(safeTexture);
 const wet={value:0},captureEnabled={value:1},fallbackMatrix={value:new THREE.Matrix4()},fallbackTexture={value:safeTexture},fallbackReady={value:0};
 const reflectionSource=source||{},uniforms={leafSceneReflection:reflectionSource.texture||fallbackTexture,leafSceneMatrix:reflectionSource.matrix||fallbackMatrix,leafSceneReady:reflectionSource.ready||fallbackReady,leafSceneWet:wet,leafSceneCaptureEnabled:captureEnabled};
 const patched=[];let disposed=false;
 function addMaterial(material){
  if(!material||patched.some(p=>p.material===material)||(!material.isMeshStandardMaterial&&!material.isMeshToonMaterial))return;
  const previous=material.onBeforeCompile,key=material.customProgramCacheKey,originalKey=key.call(material);
  const hook=function(shader,renderContext){
   previous.call(this,shader,renderContext);
   // Custom depth hooks can forward to this hook; shadow alpha must stay intact.
   if(!shader.fragmentShader.includes('#include <opaque_fragment>')||shader.fragmentShader.includes('uniform sampler2D leafSceneReflection;'))return;
   Object.assign(shader.uniforms,uniforms);
   shader.vertexShader='uniform mat4 leafSceneMatrix;varying vec4 leafSceneCoord;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
 vec4 leafSceneWorld=vec4(transformed,1.);
 #ifdef USE_BATCHING
 leafSceneWorld=batchingMatrix*leafSceneWorld;
 #endif
 #ifdef USE_INSTANCING
 leafSceneWorld=instanceMatrix*leafSceneWorld;
 #endif
 leafSceneCoord=leafSceneMatrix*modelMatrix*leafSceneWorld;`);
   shader.fragmentShader='uniform sampler2D leafSceneReflection;uniform float leafSceneWet,leafSceneReady,leafSceneCaptureEnabled;varying vec4 leafSceneCoord;\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`if(leafSceneCaptureEnabled>.5&&leafSceneWet>.001&&leafSceneReady>.5){
    vec2 leafSceneUv=leafSceneCoord.xy/max(leafSceneCoord.w,.001);
    // Existing rain lenses and painted normals remain; only their local normal
    // gently distorts this real reflected forest image.
    leafSceneUv+=normal.xy*.014*leafSceneWet;
    float leafSceneValid=step(.005,leafSceneUv.x)*step(leafSceneUv.x,.995)*step(.005,leafSceneUv.y)*step(leafSceneUv.y,.995)*step(.001,leafSceneCoord.w);
    float leafSceneFresnel=pow(1.-clamp(dot(normal,normalize(vViewPosition)),0.,1.),3.);
    vec3 leafSceneColour=texture2D(leafSceneReflection,clamp(leafSceneUv,.005,.995)).rgb;
    float leafSceneBlend=leafSceneWet*(.10+.30*leafSceneFresnel)*leafSceneValid;
    outgoingLight=mix(outgoingLight,leafSceneColour,leafSceneBlend);
   }
   #include <opaque_fragment>`);
  };
  material.onBeforeCompile=hook;material.customProgramCacheKey=()=>originalKey+'-actual-leaf-scene-reflection-v1';material.needsUpdate=true;patched.push({material,previous,key,hook});
 }
 leafMaterials.forEach(addMaterial);
 return {
  addMaterial,
  update(time,camera,wetness,mode){if(!disposed)wet.value=THREE.MathUtils.smoothstep(wetness,.12,.9);},
  // Call instead of source.render: suppressing the contribution avoids sampling
  // a render target while that same target is being written by the mirror pass.
  capture(camera){if(disposed||!reflectionSource.render)return false;captureEnabled.value=0;const previousTexture=uniforms.leafSceneReflection.value;uniforms.leafSceneReflection.value=safeTexture;try{return reflectionSource.render(camera);}finally{uniforms.leafSceneReflection.value=previousTexture;captureEnabled.value=1;}},
  dispose(){if(disposed)return;disposed=true;safeTexture.dispose();const index=resources.textures?.indexOf(safeTexture)??-1;if(index>=0)resources.textures.splice(index,1);for(const p of patched)if(p.material.onBeforeCompile===p.hook){p.material.onBeforeCompile=p.previous;p.material.customProgramCacheKey=p.key;p.material.needsUpdate=true;}}
 };
}
