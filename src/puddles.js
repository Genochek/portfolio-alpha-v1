import * as THREE from '../vendor/three.module.js';
import {puddleLayout} from './puddle-layout.mjs';
import {terrainHeight} from './ecosystem-rules.mjs';

// One shared planar reflection for every pool; its small height approximation is
// independent of the terrain-conforming wet edges, and never follows the camera.
export function createPuddles(scene,renderer,resources,reduced,options={}){
 const planeY=options.planeY??-3.30,rate=1/12,size=options.size??(typeof innerWidth!=='undefined'&&innerWidth<700?256:512);
 const target=new THREE.WebGLRenderTarget(size,size,{minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,depthBuffer:true,stencilBuffer:false,generateMipmaps:false});target.samples=0;target.texture.name='shared-forest-puddle-reflection';
 const root=new THREE.Group();root.name='world-puddles';scene.add(root);
 const ownedGeometry=[],ownedMaterials=[],groups=[],normal=new THREE.Vector3(0,1,0),eye=new THREE.Vector3(),direction=new THREE.Vector3(),up=new THREE.Vector3(),look=new THREE.Vector3(),clip=new THREE.Vector4(),q=new THREE.Vector4();
 const reflectionCamera=new THREE.PerspectiveCamera(),plane=new THREE.Plane(),textureMatrix=new THREE.Matrix4(),bias=new THREE.Matrix4().set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1);
 const uniforms={reflectionMap:{value:target.texture},reflectionMatrix:{value:textureMatrix},rainAmount:{value:0},poolTime:{value:0},reflectionReady:{value:0},poolEye:{value:new THREE.Vector3()}};
 const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.FrontSide,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1,uniforms,vertexShader:`
  uniform mat4 reflectionMatrix;varying vec2 poolUv;varying vec3 poolWorld;varying vec4 mirrorCoord;
  void main(){vec4 world=modelMatrix*vec4(position,1.);poolWorld=world.xyz;poolUv=uv*2.-1.;mirrorCoord=reflectionMatrix*world;gl_Position=projectionMatrix*viewMatrix*world;}
 `,fragmentShader:`
  uniform sampler2D reflectionMap;uniform float rainAmount,poolTime,reflectionReady;uniform vec3 poolEye;
  varying vec2 poolUv;varying vec3 poolWorld;varying vec4 mirrorCoord;
  float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  void main(){
   float angle=atan(poolUv.y,poolUv.x),radius=length(poolUv);
   float contour=.79+.085*sin(angle*3.+.4)+.055*sin(angle*5.-1.7)+.025*sin(angle*9.);
   float growth=mix(.72,1.,rainAmount);float edge=1.-smoothstep(contour*growth-.09,contour*growth,radius);if(edge<.005)discard;
   vec2 ripples=vec2(sin(poolWorld.z*13.+poolTime*1.7),cos(poolWorld.x*11.-poolTime*1.4))*.006;
   // Independent small impact rings, stable in world space rather than screen noise.
   vec2 tile=floor(poolWorld.xz*1.45),local=fract(poolWorld.xz*1.45);float ringLight=0.;
   for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++){
    vec2 offset=vec2(float(x),float(y)),cell=tile+offset;
    vec2 centre=vec2(hash(cell),hash(cell+31.7));float age=fract(poolTime*.63+hash(cell+11.));
    vec2 delta=local-offset-centre;float distanceToImpact=length(delta),ring=exp(-pow((distanceToImpact-age*.7)/.035,2.))*(1.-age);
    ripples+=normalize(delta+vec2(.001))*ring*.011;ringLight+=ring*.085;
   }
   vec3 waterNormal=normalize(vec3(ripples.x*4.,1.,ripples.y*4.));vec3 view=normalize(poolEye-poolWorld);
   float fresnel=.13+.87*pow(1.-max(0.,dot(waterNormal,view)),3.);
   vec2 projected=mirrorCoord.xy/max(mirrorCoord.w,.001);projected+=ripples*.24*rainAmount;
   float valid=step(0.,projected.x)*step(projected.x,1.)*step(0.,projected.y)*step(projected.y,1.)*step(0.,mirrorCoord.w)*reflectionReady;
   vec3 reflected=texture2D(reflectionMap,clamp(projected,.001,.999)).rgb;
   vec3 colour=mix(vec3(.055,.095,.085),reflected,mix(.46,.94,fresnel)*valid);
   colour+=vec3(.24,.33,.35)*ringLight*rainAmount;
   gl_FragColor=vec4(colour,edge*rainAmount*.92);
   #include <tonemapping_fragment>
   #include <colorspace_fragment>
  }
 `});resources.materials.push(material);ownedMaterials.push(material);
 function poolGeometry(x,z,rx,rz,rotation){
  const vertices=[],uv=[],indices=[],rings=7,segments=48;
  // Terrain variation is only centimetres across most edges. Following it avoids
  // hovering rims and lets vegetation occlude the shallow water naturally.
  for(let ring=0;ring<=rings;ring++)for(let j=0;j<=segments;j++){const a=j/segments*Math.PI*2,r=ring/rings,u=Math.cos(a)*r,v=Math.sin(a)*r,dx=u*rx,dz=v*rz,px=x+dx*Math.cos(rotation)-dz*Math.sin(rotation),pz=z+dx*Math.sin(rotation)+dz*Math.cos(rotation);vertices.push(px,terrainHeight(px,pz)+.027,pz);uv.push(u*.5+.5,v*.5+.5);if(ring<rings&&j<segments){const index=ring*(segments+1)+j;indices.push(index,index+1,index+segments+1,index+1,index+segments+2,index+segments+1);}}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();resources.geometries.push(geometry);ownedGeometry.push(geometry);return geometry;
 }
 function addPatch(anchor,kind,id){
  const group=new THREE.Group();group.name='puddles-'+kind;root.add(group);
  for(const pool of puddleLayout(id)){const mesh=new THREE.Mesh(poolGeometry(pool.x,pool.z,pool.rx,pool.rz,pool.rotation),material);mesh.name='rain-pool';mesh.renderOrder=1;mesh.receiveShadow=false;group.add(mesh);}groups.push({group,anchor,kind});
 }
 if(options.stations?.length)options.stations.forEach((station,i)=>addPatch(station.group||station,'artists',station.slot??i));
 else for(let i=0;i<6;i++){const anchor=new THREE.Group();anchor.position.z=-i*18;addPatch(anchor,'artists',i);}
 addPatch(options.portfolioAnchor||null,'portfolio',97);addPatch(options.infoAnchor||null,'info',53);
 let amount=0,time=0,lastCapture=-Infinity,disposed=false,active=false;const anchorMatrix=new THREE.Matrix4();
 function configureReflection(camera){
  camera.updateMatrixWorld(true);camera.getWorldPosition(eye);if(eye.y<=planeY+.05)return false;
  camera.getWorldDirection(direction);look.copy(eye).add(direction);eye.y=2*planeY-eye.y;look.y=2*planeY-look.y;
  up.set(0,1,0).transformDirection(camera.matrixWorld).reflect(normal).negate();reflectionCamera.position.copy(eye);reflectionCamera.up.copy(up);reflectionCamera.lookAt(look);reflectionCamera.near=camera.near;reflectionCamera.far=camera.far;reflectionCamera.layers.mask=camera.layers.mask;reflectionCamera.layers.disable(1);reflectionCamera.projectionMatrix.copy(camera.projectionMatrix);reflectionCamera.updateMatrixWorld(true);
  plane.set(normal,-planeY).applyMatrix4(reflectionCamera.matrixWorldInverse);clip.set(plane.normal.x,plane.normal.y,plane.normal.z,plane.constant);
  const projection=reflectionCamera.projectionMatrix.elements;q.set((Math.sign(clip.x)+projection[8])/projection[0],(Math.sign(clip.y)+projection[9])/projection[5],-1,(1+projection[10])/projection[14]);clip.multiplyScalar(2/clip.dot(q));projection[2]=clip.x;projection[6]=clip.y;projection[10]=clip.z+1-.0004;projection[14]=clip.w;reflectionCamera.projectionMatrixInverse.copy(reflectionCamera.projectionMatrix).invert();
  textureMatrix.copy(bias).multiply(reflectionCamera.projectionMatrix).multiply(reflectionCamera.matrixWorldInverse);return true;
 }
 const api={
  reflectionSource:{texture:uniforms.reflectionMap,matrix:uniforms.reflectionMatrix,ready:uniforms.reflectionReady,render:camera=>api.render(camera)},
  update(now,dt,camera,wetness,z=0,mode='artists'){
   if(disposed)return;const desired=THREE.MathUtils.smoothstep(wetness,.25,.83);amount=reduced?.matches?desired:THREE.MathUtils.damp(amount,desired,2.4,Math.max(0,Math.min(.1,dt||0)));if(amount<.0005)amount=0;uniforms.rainAmount.value=amount;if(!reduced?.matches)uniforms.poolTime.value=now;time=now;camera.getWorldPosition(uniforms.poolEye.value);
   for(const patch of groups){patch.group.visible=patch.kind===mode&&(!patch.anchor||patch.anchor.visible);if(patch.anchor){patch.anchor.updateWorldMatrix(true,false);anchorMatrix.copy(patch.anchor.matrixWorld);patch.group.matrixAutoUpdate=false;patch.group.matrix.copy(anchorMatrix);}else patch.group.position.z=patch.kind==='portfolio'?z-2:z+10;}
   active=amount>.001&&camera.position.y>planeY+.09;root.visible=active;
  },
  render(camera){
   if(disposed||!active||time-lastCapture<rate||!configureReflection(camera))return false;
   const saved={target:renderer.getRenderTarget(),cube:renderer.getActiveCubeFace?.()??0,mipmap:renderer.getActiveMipmapLevel?.()??0,autoClear:renderer.autoClear,clearAlpha:renderer.getClearAlpha(),clearColor:renderer.getClearColor(new THREE.Color()).clone(),viewport:renderer.getViewport(new THREE.Vector4()).clone(),scissor:renderer.getScissor(new THREE.Vector4()).clone(),scissorTest:renderer.getScissorTest(),clippingPlanes:renderer.clippingPlanes,localClippingEnabled:renderer.localClippingEnabled,shadowAuto:renderer.shadowMap.autoUpdate,shadowNeeds:renderer.shadowMap.needsUpdate,xr:renderer.xr?.enabled,visible:root.visible};
   try{root.visible=false;renderer.autoClear=true;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=false;if(renderer.xr)renderer.xr.enabled=false;renderer.setRenderTarget(target);renderer.setViewport(0,0,size,size);renderer.setScissorTest(false);renderer.clear();renderer.render(scene,reflectionCamera);uniforms.reflectionReady.value=1;lastCapture=time;return true;}
   finally{root.visible=saved.visible;renderer.autoClear=saved.autoClear;renderer.shadowMap.autoUpdate=saved.shadowAuto;renderer.shadowMap.needsUpdate=saved.shadowNeeds;if(renderer.xr)renderer.xr.enabled=saved.xr;renderer.clippingPlanes=saved.clippingPlanes;renderer.localClippingEnabled=saved.localClippingEnabled;renderer.setClearColor(saved.clearColor,saved.clearAlpha);renderer.setRenderTarget(saved.target,saved.cube,saved.mipmap);renderer.setViewport(saved.viewport);renderer.setScissor(saved.scissor);renderer.setScissorTest(saved.scissorTest);}
  },
  releaseGPU(){target.dispose();uniforms.reflectionReady.value=0;lastCapture=-Infinity;},
  dispose(){if(disposed)return;disposed=true;scene.remove(root);target.dispose();for(const geometry of ownedGeometry){geometry.dispose();const i=resources.geometries.indexOf(geometry);if(i>=0)resources.geometries.splice(i,1);}for(const m of ownedMaterials){m.dispose();const i=resources.materials.indexOf(m);if(i>=0)resources.materials.splice(i,1);}}
 };return api;
}
