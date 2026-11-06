import * as THREE from '../vendor/three.module.js';
import {skyBird} from './sky-birds.mjs';
export function createSky(scene,resources,time){
 const birds=Array.from({length:3},()=>new THREE.Vector4());
 const material=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{clock:time,rain:{value:0},birds:{value:birds}},vertexShader:'varying vec3 direction;void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`varying vec3 direction;uniform float clock,rain;uniform vec4 birds[3];
 float hash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
 float n(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*f*(f*(f*6.-15.)+10.);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+1.),f.x),f.y),f.z);}
 float clouds(vec3 p){float a=.5,v=0.;for(int i=0;i<4;i++){v+=a*n(p);p=p*2.03+vec3(13.1,7.7,4.8);a*=.5;}return v*1.0333;}
 float segment(vec2 p,vec2 a,vec2 b){vec2 q=p-a,v=b-a;return length(q-v*clamp(dot(q,v)/dot(v,v),0.,1.));}
 void main(){vec3 d=normalize(direction);float h=smoothstep(-.04,.4,d.y);vec3 sky=mix(vec3(.35,.60,.70),vec3(.02,.18,.60),h);
  // Directional 3D noise avoids stretching a flat noise grid at the horizon.
  vec3 cp=d*4.8+vec3(clock*.0012,1.3,-2.7);float field=clouds(cp+vec3(n(cp*.6)*.7));float cloud=smoothstep(.34,.63,field)*smoothstep(-.01,.12,d.y);float crest=field+(n(cp+vec3(-.12,.25,-.08))-n(cp))*.4;vec3 cloudColour=mix(vec3(.49,.63,.73),vec3(1.15,1.10,1.00),smoothstep(.36,.61,crest));sky=mix(sky,cloudColour,cloud*.94);
  vec3 sun=normalize(vec3(-7.,19.,-38.));float angle=dot(d,sun);sky+=vec3(1.,.77,.37)*pow(max(0.,angle),65.)*.45;sky+=vec3(6.,4.8,2.8)*smoothstep(.9995,.99985,angle);
  sky=mix(sky,mix(vec3(.22,.32,.40),vec3(.12,.20,.30),h),rain*.86);
  vec2 angular=vec2(atan(d.x,-d.z),asin(d.y));for(int i=0;i<3;i++){vec4 b=birds[i];vec2 p=angular-b.xy;float s=.0105;vec2 elbow=vec2(s*.42,s*(.18+b.z*.5)),tip=vec2(s,s*(-.12+b.z));vec2 q=vec2(abs(p.x),p.y);float wing=min(segment(q,vec2(0.),elbow),segment(q,elbow,tip));float ink=(1.-smoothstep(.00045,.00125,wing))*b.w*(1.-rain*.7);sky=mix(sky,vec3(.15,.22,.25),ink*.83);}
  gl_FragColor=vec4(sky,1.);
 }`});
 const geometry=new THREE.SphereGeometry(88,48,32),sky=new THREE.Mesh(geometry,material);sky.renderOrder=-100;scene.add(sky);resources.geometries.push(geometry);resources.materials.push(material);return {update(camera,rain=0){sky.position.copy(camera.position);material.uniforms.rain.value=rain;for(let i=0;i<3;i++){const b=skyBird(time.value,i,time.value===0);birds[i].set(b.x,b.y,b.flap,b.opacity);}}};
}
