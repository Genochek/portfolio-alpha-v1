import * as THREE from '../vendor/three.module.js';
import {createVolume} from './volume.js';
import {fxaaFragment} from './fxaa-shader.mjs';
import {warmupPasses} from './film-warmup.mjs';

// A restrained film composite followed by final, edge-selective FXAA.
// It never accumulates frames, so tab changes cannot leave a ghost image behind.
export function createFilmPass(renderer){
  const target=new THREE.WebGLRenderTarget(1,1,{type:renderer.extensions.has('EXT_color_buffer_float')?THREE.HalfFloatType:THREE.UnsignedByteType,depthBuffer:true});
  target.samples=Math.min(4,renderer.capabilities.maxSamples);target.depthTexture=new THREE.DepthTexture(1,1,THREE.UnsignedIntType);target.resolveDepthBuffer=true;
  const labels=new THREE.WebGLRenderTarget(1,1,{type:target.texture.type,depthBuffer:true});labels.depthTexture=target.depthTexture;
  // Display-encoded intermediate: FXAA must see the final fog and ink edges.
  // No texture colour-space tag: the final pass copies encoded values verbatim.
  const composite=new THREE.WebGLRenderTarget(1,1,{type:THREE.UnsignedByteType,depthBuffer:false});
  const volume=createVolume(renderer,target.depthTexture);
  const bayer=[0,48,12,60,3,51,15,63,32,16,44,28,35,19,47,31,8,56,4,52,11,59,7,55,40,24,36,20,43,27,39,23,2,50,14,62,1,49,13,61,34,18,46,30,33,17,45,29,10,58,6,54,9,57,5,53,42,26,38,22,41,25,37,21];
  const bayerPixels=new Uint8Array(8*8*4);bayer.forEach((v,i)=>{const t=Math.round((v+.5)/64*255);bayerPixels.set([t,t,t,255],i*4);});
  const bayerTexture=new THREE.DataTexture(bayerPixels,8,8,THREE.RGBAFormat);bayerTexture.wrapS=bayerTexture.wrapT=THREE.RepeatWrapping;bayerTexture.minFilter=bayerTexture.magFilter=THREE.NearestFilter;bayerTexture.needsUpdate=true;
  const material=new THREE.ShaderMaterial({
    toneMapped:false,depthTest:false,depthWrite:false,
    uniforms:{toneMappingExposure:{value:renderer.toneMappingExposure},labels:{value:labels.texture},image:{value:target.texture},fogVolume:{value:volume.texture},bayer:{value:bayerTexture},resolution:{value:new THREE.Vector2(1,1)},motion:{value:0},mobile:{value:0}},
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader:`uniform sampler2D labels;uniform sampler2D image;uniform sampler2D fogVolume;uniform sampler2D bayer;uniform vec2 resolution;uniform float motion;uniform float mobile;varying vec2 vUv;
      #include <tonemapping_pars_fragment>
      void main(){
        vec2 texel=1.0/resolution;
        vec2 flow=vec2(.22,.75)*motion*5.0*texel;
        vec3 base=texture2D(image,vUv).rgb*.4;
        base+=(texture2D(image,vUv+flow).rgb+texture2D(image,vUv-flow).rgb)*.24;
        base+=(texture2D(image,vUv+flow*2.).rgb+texture2D(image,vUv-flow*2.).rgb)*.06;
        vec3 bloom=vec3(0.);
        for(int i=0;i<8;i++){float angle=float(i)*.785398;vec2 offset=vec2(cos(angle),sin(angle))*texel*5.;vec3 light=texture2D(image,vUv+offset).rgb;float lum=dot(light,vec3(.2126,.7152,.0722));bloom+=light*smoothstep(1.4,3.2,lum);}
        vec4 fog=texture2D(fogVolume,vUv);gl_FragColor=vec4(base*fog.a+fog.rgb+bloom*.025,1.);
        vec4 ink=texture2D(labels,vUv);gl_FragColor.rgb=gl_FragColor.rgb*(1.-ink.a)+ink.rgb;
        // The garden uses ACES. Resolve it once here, before edge analysis;
        // offscreen renders otherwise disable Three's automatic tone mapping.
        gl_FragColor.rgb=ACESFilmicToneMapping(gl_FragColor.rgb);
        gl_FragColor=sRGBTransferOETF(gl_FragColor);
        float dither=texture2D(bayer,gl_FragCoord.xy/16.).r;
        float shade=1.-smoothstep(.22,.7,dot(gl_FragColor.rgb,vec3(.2126,.7152,.0722)));
        vec3 paper=floor(gl_FragColor.rgb*48.+dither)/48.;
        gl_FragColor.rgb=mix(gl_FragColor.rgb,paper,.035*shade);
      }`
  });
  const geometry=new THREE.PlaneGeometry(2,2),scene=new THREE.Scene(),camera=new THREE.Camera();scene.add(new THREE.Mesh(geometry,material));
  const aaMaterial=new THREE.ShaderMaterial({toneMapped:false,depthTest:false,depthWrite:false,uniforms:{image:{value:composite.texture},inverseResolution:{value:new THREE.Vector2(1,1)}},vertexShader:material.vertexShader,fragmentShader:fxaaFragment});
  const aaScene=new THREE.Scene();aaScene.add(new THREE.Mesh(geometry,aaMaterial));
  return {
    resize(w,h){target.setSize(w,h);labels.setSize(w,h);composite.setSize(w,h);volume.resize(w,h);material.uniforms.resolution.value.set(w,h);aaMaterial.uniforms.inverseResolution.value.set(1/w,1/h);material.uniforms.mobile.value=innerWidth<700?1:0;},
    warmup(world,worldCamera){return warmupPasses(renderer,[{scene:world,camera:worldCamera,target,mask:1},{scene,camera,target:composite},{scene:aaScene,camera,target:null}]);},
    render(world,worldCamera,motion,sun,time,enabled=1,rain=0){material.uniforms.motion.value=motion;material.uniforms.toneMappingExposure.value=renderer.toneMappingExposure;worldCamera.layers.set(0);renderer.setRenderTarget(target);renderer.render(world,worldCamera);const stats={triangles:renderer.info.render.triangles,calls:renderer.info.render.calls,samples:target.samples,cameraY:worldCamera.position.y,cameraX:worldCamera.position.x,cameraZ:worldCamera.position.z,width:target.width,height:target.height};volume.render(worldCamera,sun,time,enabled,rain);const background=world.background,auto=renderer.autoClear,shadowAuto=renderer.shadowMap.autoUpdate,clear=new THREE.Color();renderer.getClearColor(clear);const alpha=renderer.getClearAlpha();world.background=null;renderer.autoClear=false;renderer.shadowMap.autoUpdate=false;renderer.setRenderTarget(labels);renderer.setClearColor(0,0);renderer.clear(true,false,false);worldCamera.layers.set(1);renderer.render(world,worldCamera);worldCamera.layers.set(0);world.background=background;renderer.autoClear=auto;renderer.shadowMap.autoUpdate=shadowAuto;renderer.setClearColor(clear,alpha);renderer.setRenderTarget(composite);renderer.render(scene,camera);renderer.setRenderTarget(null);renderer.render(aaScene,camera);return stats;},
    dispose(){labels.dispose();volume.dispose();target.depthTexture.dispose();target.dispose();composite.dispose();bayerTexture.dispose();geometry.dispose();material.dispose();aaMaterial.dispose();}
  };
}

