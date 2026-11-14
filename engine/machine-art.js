// Hand-drawn 32 px sprites. Conveyor and pump outlets point east in the atlas.
export const machineArt = {
 generator(rect, frame) {
  rect(4, 25, 24, 4, '#17262c');
  rect(5, 9, 22, 17, '#385950');
  rect(7, 7, 15, 3, '#74978b');
  rect(8, 12, 15, 11, '#132c2b');
  rect(23, 5, 4, 9, '#648178');
  for (let i = 0; i < 4; i++) {
   rect(9 + i * 3, 14, 2, 7, frame === i + 1 ? '#bbffe3' : '#5aa589');
  }
  rect(4, 26, 5, 4, '#577269');
  rect(23, 26, 5, 4, '#577269');
 },
 drill(rect, frame) {
  rect(4, 7, 5, 21, '#8f6a44');
  rect(23, 7, 5, 21, '#8f6a44');
  rect(3, 26, 8, 3, '#e9b562');
  rect(21, 26, 8, 3, '#e9b562');
  rect(7, 5, 18, 11, '#d29244');
  rect(8, 6, 16, 3, '#ffe096');
  rect(10, 10, 12, 4, '#5b4734');
  rect(14, 14, 4, 8, '#b7cbcc');
  const bitY = 19 + [0, 1, 3, 4, 2][frame];
  rect(11, bitY, 10, 3, '#728a90');
  rect(13, bitY + 3, 6, 3, '#b7cbcc');
  rect(15, bitY + 6, 2, 2, '#ffe096');
 },
 belt(rect, frame) {
  rect(2, 10, 28, 12, '#253b43');
  rect(3, 10, 26, 2, '#8babaa');
  rect(3, 20, 26, 2, '#8babaa');
  for (let i = 0; i < 6; i++) rect(4 + i * 4, 13, 2, 6, '#526d75');
  if (frame) rect(4 + (frame - 1) * 5, 14, 4, 4, '#f4c777');
  rect(19, 15, 8, 2, '#d4ece4');
  rect(24, 13, 2, 6, '#d4ece4');
 },
 pump(rect, frame) {
  rect(6, 25, 18, 3, '#42747d');
  rect(7, 8, 15, 17, '#337783');
  rect(10, 6, 9, 3, '#91c8ce');
  rect(19, 13, 10, 7, '#618b93');
  rect(27, 12, 3, 9, '#92b8bb');
  rect(10, 11, 10, 11, '#173f53');
  rect(11, 16 - (frame % 3), 8, 5 + (frame % 3), frame ? '#6be2f3' : '#427c99');
  if (frame) rect(22, 15, 4, 3, '#a3f4ff');
 }
};

export function isMachineAnimating(machine, power) {
 const action = machine.lastAction || '';
 switch (machine.kind) {
  case 'generator': return true;
  case 'drill': return power.online && /^(Mining |Sending )/.test(action);
  case 'belt': return action.startsWith('Sending ');
  case 'pump': return power.online && action === 'Pumping water';
  default: return true;
 }
}
