export const NEW_ENEMIES = {
  jualasAlarm: { name: 'Jualas Schtrak', hp: 120, speed: 105, power: 14, reach: 160, score: 290, color: '#efb56d', height: 148 },
  tchoin: { name: 'Kiks la Tchoin', hp: 115, speed: 160, power: 13, reach: 285, score: 300, color: '#f17bd0', height: 148 },
  jalatrixGamer: { name: 'Jalatrix · Le Gamer', hp: 150, speed: 95, power: 11, reach: 400, score: 360, color: '#a58aff', height: 148 },
  julioKid: { name: 'Julio', hp: 65, speed: 190, power: 9, reach: 310, score: 180, color: '#c5b79b', height: 110 },
  djeKid: { name: 'Djé · Le Gamin', hp: 60, speed: 205, power: 9, reach: 310, score: 180, color: '#48c1b3', height: 110 },
  yinyin: { name: 'Yinyin', hp: 92, speed: 145, power: 12, reach: 135, score: 240, color: '#69b7ef', height: 148 },
  caro: { name: 'Caro', hp: 125, speed: 110, power: 14, reach: 125, score: 270, color: '#e47b9d', height: 148 },
  dje: { name: 'Djé', hp: 95, speed: 155, power: 13, reach: 370, score: 280, color: '#e6a65a', height: 148 },
  karmoilefion: { name: 'KarMoiLeFion', hp: 145, speed: 140, power: 16, reach: 390, score: 300, color: '#afb9cd', height: 130 },
};
export const NEW_SPRITE_IDS = [...Object.keys(NEW_ENEMIES), 'triso'];
export const NEW_ENEMY_POSES = {
  idle: [0, 1], walk: [2, 3], punch: [4, 5, 6, 7], kick: [4, 5, 6, 7],
  special: [8, 9, 10, 11], hurt: [12, 13], dead: [14, 15],
};
