export const artists = [
  {name:'G3nochek',text:'мейн карта далбаеба',color:'#bdc998',links:[]},
  {name:'emore',text:'карта для спокойных треков и тех, что не хочу на видеть на основе',color:'#d4b7a1',links:[]},
  {name:'tripliehalo',text:'карта для голоса ес вкратце',color:'#b9b5d0',links:[]}
];
// Только реальные материалы. Для видео: {type:'video', title, src, poster}.
export const works = [
  {type:'audio',title:'demo 1',src:'пока так.wav'},
  {type:'audio',title:'demo 2',src:'сильно не кринжевать пж.mp3'},
  {type:'audio',title:'demo 3',src:'пока примерно так.mp3'},
  {type:'audio',title:'demo 4',src:'блювать сасать.mp3'}
];
export const infoLinks = [{label:'связь',url:'https://t.me/Genochek'}];
// Позже сюда можно добавить фоновый звук. Запускается после первого действия
// посетителя и плавно приглушается, когда играет музыкальная работа.
export const soundscape = {src:null,volume:.3};
