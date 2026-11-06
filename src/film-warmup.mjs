// compileAsync starts compilation synchronously; never hold renderer state
// across its asynchronous GPU readiness wait.
export async function warmupPasses(renderer,passes){
 const previousTarget=renderer.getRenderTarget(),pending=[];
 try{
  for(const pass of passes){
   const mask=pass.camera.layers.mask;
   try{
    renderer.setRenderTarget(pass.target);if(pass.mask!==undefined)pass.camera.layers.mask=pass.mask;
    pending.push(renderer.compileAsync?renderer.compileAsync(pass.scene,pass.camera):renderer.compile(pass.scene,pass.camera));
   }finally{pass.camera.layers.mask=mask;}
  }
 }finally{renderer.setRenderTarget(previousTarget);}
 await Promise.all(pending);
}
