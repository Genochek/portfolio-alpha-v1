// Original pen-drawn letterforms. The artist wordmarks are paths, not a typeset title.
const glyphs={
  G:[72,'M65 24Q42 8 22 29Q1 56 17 80Q34 105 63 82L64 57L42 58'],
  '3':[62,'M12 28Q39 7 54 26Q66 43 32 52Q72 48 57 79Q42 101 13 83'],
  n:[64,'M10 87L11 38Q14 29 15 51Q31 25 44 41Q56 48 52 87'],
  o:[64,'M35 35C3 28 0 87 28 89C62 94 67 34 35 35Z'],
  c:[57,'M51 41Q18 22 9 59Q0 96 48 85'],
  h:[64,'M11 87Q19 43 11 7M13 58Q37 24 49 47L50 88'],
  e:[61,'M10 61Q59 70 50 43Q40 23 21 40Q0 55 11 78Q27 98 55 80'],
  k:[60,'M14 8L12 88M51 38L16 64L54 88'],
  m:[86,'M9 87L9 36L13 57Q31 19 41 46L43 86M43 57Q65 22 77 46L77 88'],
  r:[53,'M12 88L11 38L14 56Q30 26 47 36'],
  t:[55,'M28 16L25 73Q26 98 47 85M6 42L49 39'],
  i:[33,'M16 43L16 86M17 22L17 24'],
  p:[64,'M12 114L12 39M14 48Q46 20 57 49Q66 84 16 81'],
  l:[36,'M16 9Q22 46 14 76Q12 94 31 85'],
  a:[60,'M46 46Q28 25 13 45Q-3 77 17 85Q36 95 46 66L47 85']
};

export function paintWordmark(canvas,name){
  const ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);
  const letters=[...name],width=letters.reduce((sum,ch)=>sum+(glyphs[ch]?.[0]||50)+5,0);
  const scale=Math.min(3.35,(canvas.width-180)/width),left=(canvas.width-width*scale)/2;
  ctx.save();ctx.translate(left,52);ctx.scale(scale,scale);ctx.lineCap='round';ctx.lineJoin='round';
  let cursor=0;
  letters.forEach((ch,index)=>{
    const [advance,path]=glyphs[ch]||[50,'M10 40L35 85'];
    ctx.save();ctx.translate(cursor,Math.sin(index*1.7)*2.2);ctx.rotate(Math.sin(index*2.3)*.018);const pen=new Path2D(path);
    ctx.strokeStyle='#a579cd';ctx.lineWidth=4.6;ctx.shadowColor='#b695de77';ctx.shadowBlur=4;ctx.stroke(pen);
    ctx.shadowBlur=0;ctx.strokeStyle='#895bb6';ctx.lineWidth=4.2;ctx.stroke(pen);
    ctx.strokeStyle='#e6c9f957';ctx.lineWidth=.35;ctx.translate(-.35,-.25);ctx.stroke(pen);
    ctx.restore();cursor+=advance+5;
  });
  // A few soft pen trails continue the plant stems, never obscure the letters.
  ctx.strokeStyle='#c7a8ed88';ctx.lineWidth=.65;
  for(const i of [1,Math.max(2,letters.length-2)]){const x=width*(i+.6)/letters.length;ctx.beginPath();ctx.moveTo(x,94);ctx.bezierCurveTo(x-5,105,x+9,111,x+4,125);ctx.stroke();}
  ctx.restore();
}
