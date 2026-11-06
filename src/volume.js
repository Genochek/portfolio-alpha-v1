import * as THREE from '../vendor/three.module.js';

// Integrates a world-space density field up to the resolved surface depth.
// There are no fog cards to intersect leaves or translate with the observer.
export function createVolume(renderer,depth){
 const target=new THREE.WebGLRenderTarget(1,1,{type:renderer.extensions.has('EXT_color_buffer_float')?THREE.HalfFloatType:THREE.UnsignedByteType,depthBuffer:false});
 const u={surfaceDepth:{value:depth},shadowDepth:{value:null},inverseProjection:{value:new THREE.Matrix4()},cameraWorld:{value:new THREE.Matrix4()},shadowMatrix:{value:new THREE.Matrix4()},eye:{value:new THREE.Vector3()},sunDirection:{value:new THREE.Vector3(-.4,.5,-1).normalize()},time:{value:0},enabled:{value:1},rain:{value:0},steps:{value:innerWidth<700?24:40}};
 const material=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:u,vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:`precision highp float;
  varying vec2 vUv;uniform sampler2D surfaceDepth;uniform highp sampler2DShadow shadowDepth;
  uniform mat4 inverseProjection,cameraWorld,shadowMatrix;uniform vec3 eye,sunDirection;uniform float time,enabled,steps,rain;
  float hash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
  float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
  void main(){if(enabled<.01){gl_FragColor=vec4(0,0,0,1);return;}
   float depth=texture2D(surfaceDepth,vUv).r;vec4 view=inverseProjection*vec4(vUv*2.-1.,depth*2.-1.,1.);view/=view.w;vec3 end=(cameraWorld*view).xyz,ray=normalize(end-eye);float distance=min(length(end-eye),75.);
   float stepSize=distance/steps,transmittance=1.;vec3 light=vec3(0.);
   float jitter=0.;
   for(int i=0;i<40;i++){if(float(i)>=steps)break;float t=(float(i)+.5+jitter*.3)*stepSize;vec3 p=eye+ray*t;
    float cloud=noise(p*vec3(.14,.29,.11)+vec3(time*.013,0.,0.));
    float low=1.-smoothstep(-2.8,4.5,p.y);float density=(.003+low*low*(.028+pow(cloud,2.)*.055)+smoothstep(24.,65.,t)*.07*(1.-smoothstep(5.,17.,p.y)))*smoothstep(.15,1.5,t);
    density*=mix(.32+.68*smoothstep(4.,25.,t),.82+.18*smoothstep(4.,18.,t),rain);
    vec4 sc=shadowMatrix*vec4(p,1.);vec3 suv=sc.xyz/sc.w;float lit=1.;if(all(greaterThanEqual(suv,vec3(0.)))&&all(lessThanEqual(suv,vec3(1.))))lit=texture(shadowDepth,vec3(suv.xy,suv.z-.0005));
    vec3 ambient=mix(vec3(.075,.12,.085),vec3(.54,.76,.89),smoothstep(-3.5,5.,p.y));
    float forward=pow(max(0.,dot(ray,sunDirection)),24.);vec3 scatter=ambient*.76+vec3(1.5,1.55,1.42)*lit*(.12+forward*.85)*smoothstep(-3.5,2.,p.y);
    float forestEnd=smoothstep(20.,58.,t)*(1.-smoothstep(1.,8.,p.y));scatter=mix(scatter,mix(vec3(.027,.060,.037),vec3(.075,.105,.15),rain),forestEnd*.93);
    density=density*(1.+rain*1.75)+rain*(.006+low*.012)*(.6+cloud*.7)*smoothstep(.5,3.,t);scatter=mix(scatter,mix(vec3(.14,.18,.24),vec3(.48,.57,.70),smoothstep(-3.5,5.,p.y))*.9,rain*.9);float a=1.-exp(-density*stepSize);light+=transmittance*a*scatter;transmittance*=1.-a;
   }
   float deepForest=smoothstep(38.,70.,distance)*(1.-smoothstep(0.,8.,end.y));vec3 deepColour=mix(vec3(.030,.068,.043),vec3(.08,.11,.16),rain);light=mix(light,deepColour*(1.-transmittance),deepForest*.72);
   // Continuous optical depth, rather than a distant plane or a sharp cut-off.
   // A trunk 30–45m away loses almost all contrast; high clouds keep their light.
   float heightMask=1.-smoothstep(5.,17.,end.y);
   float opticalDepth=pow(max(distance-12.,0.)/11.5,1.65)*heightMask*(1.+rain*.32);
   float extinction=exp(-opticalDepth);
   // Use a common atmospheric height along each ray, not the hit surface's height:
   // otherwise an opaque distant trunk changes the fog colour and outlines itself.
   float hazeHeight=eye.y+ray.y*28.;
   vec3 horizonColour=mix(vec3(.045,.095,.065),vec3(.30,.44,.46),smoothstep(-3.5,7.,hazeHeight));
   vec3 rainHorizon=mix(vec3(.065,.095,.145),vec3(.31,.41,.56),smoothstep(-3.5,7.,hazeHeight));
   horizonColour=mix(horizonColour,rainHorizon,rain);
   light=light*extinction+horizonColour*(1.-extinction);transmittance*=extinction;
   gl_FragColor=vec4(light,transmittance);
  }`});
 const scene=new THREE.Scene(),camera=new THREE.Camera(),geo=new THREE.PlaneGeometry(2,2);scene.add(new THREE.Mesh(geo,material));
 return {texture:target.texture,resize(w,h){target.setSize(Math.max(1,Math.ceil(w*.75)),Math.max(1,Math.ceil(h*.75)));},render(camera3D,sun,time,enabled,rain=0){u.rain.value=rain;u.inverseProjection.value.copy(camera3D.projectionMatrixInverse);u.cameraWorld.value.copy(camera3D.matrixWorld);u.eye.value.copy(camera3D.position);u.time.value=time;u.enabled.value=enabled;u.shadowDepth.value=sun.shadow.map.depthTexture;u.shadowMatrix.value.copy(sun.shadow.matrix);u.sunDirection.value.subVectors(sun.position,sun.target.position).normalize();renderer.setRenderTarget(target);renderer.render(scene,camera);},dispose(){target.dispose();material.dispose();geo.dispose();}};
}
