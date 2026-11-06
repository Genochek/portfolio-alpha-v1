// Adapted from Three.js examples/jsm/shaders/FXAAShader.js (MIT; see
// vendor/THREE-LICENSE.txt). NVIDIA FXAA, Jasper Flick / Dave Hoskins port.
// https://github.com/mrdoob/three.js/blob/master/examples/jsm/shaders/FXAAShader.js
// Run on the final display-encoded image, not on HDR or pre-fog leaf colour.
export const fxaaFragment=`
 uniform sampler2D image;uniform vec2 inverseResolution;varying vec2 vUv;
 const float steps[6]=float[6](1.0,1.5,2.0,2.0,2.0,4.0);
 float luminance(vec2 uv){return dot(texture2D(image,uv).rgb,vec3(.3,.59,.11));}
 void main(){
  vec2 t=inverseResolution;vec4 original=texture2D(image,vUv);
  float m=dot(original.rgb,vec3(.3,.59,.11));
  float n=luminance(vUv+vec2(0.,t.y)),s=luminance(vUv-vec2(0.,t.y));
  float e=luminance(vUv+vec2(t.x,0.)),w=luminance(vUv-vec2(t.x,0.));
  float high=max(m,max(max(n,s),max(e,w))),low=min(m,min(min(n,s),min(e,w))),contrast=high-low;
  // Leave low-contrast interiors completely unchanged.
  if(contrast<max(.0312,high*.125)){gl_FragColor=original;return;}
  float ne=luminance(vUv+t),nw=luminance(vUv+vec2(-t.x,t.y));
  float se=luminance(vUv+vec2(t.x,-t.y)),sw=luminance(vUv-t);
  float horizontal=abs(n+s-2.*m)*2.+abs(ne+se-2.*e)+abs(nw+sw-2.*w);
  float vertical=abs(e+w-2.*m)*2.+abs(ne+nw-2.*n)+abs(se+sw-2.*s);
  bool alongX=horizontal>=vertical;
  float positive=alongX?n:e,negative=alongX?s:w;
  float positiveGradient=abs(positive-m),negativeGradient=abs(negative-m);
  float pixelStep=alongX?t.y:t.x;
  float opposite=positive,gradient=positiveGradient;
  if(positiveGradient<negativeGradient){pixelStep=-pixelStep;opposite=negative;gradient=negativeGradient;}
  vec2 edgeUV=vUv+(alongX?vec2(0.,pixelStep*.5):vec2(pixelStep*.5,0.));
  vec2 tangent=alongX?vec2(t.x,0.):vec2(0.,t.y);
  float edgeLuma=(m+opposite)*.5,threshold=gradient*.25;
  vec2 p=edgeUV+tangent,nuv=edgeUV-tangent;
  float pd=luminance(p)-edgeLuma,nd=luminance(nuv)-edgeLuma;
  bool pEnd=abs(pd)>=threshold,nEnd=abs(nd)>=threshold;
  for(int i=1;i<6;i++){
   if(!pEnd){p+=tangent*steps[i];pd=luminance(p)-edgeLuma;pEnd=abs(pd)>=threshold;}
   if(!nEnd){nuv-=tangent*steps[i];nd=luminance(nuv)-edgeLuma;nEnd=abs(nd)>=threshold;}
   if(pEnd&&nEnd)break;
  }
  if(!pEnd)p+=tangent*8.;if(!nEnd)nuv-=tangent*8.;
  float pDistance=alongX?p.x-vUv.x:p.y-vUv.y,nDistance=alongX?vUv.x-nuv.x:vUv.y-nuv.y;
  float shortest=min(pDistance,nDistance),edgeBlend=0.;
  bool deltaSign=(pDistance<=nDistance?pd:nd)>=0.;
  if(deltaSign!=(m-edgeLuma>=0.))edgeBlend=.5-shortest/(pDistance+nDistance);
  float subpixel=clamp(abs((2.*(n+e+s+w)+ne+nw+se+sw)/12.-m)/contrast,0.,1.);
  subpixel=smoothstep(0.,1.,subpixel);subpixel=subpixel*subpixel*.5;
  float blend=max(subpixel,edgeBlend);
  vec2 uv=vUv+(alongX?vec2(0.,pixelStep*blend):vec2(pixelStep*blend,0.));
  gl_FragColor=texture2D(image,uv);
 }
`;
