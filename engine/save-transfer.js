export function decodeFactorySave(text, cellCount, tileCount) {
 if (text.length > 2000000) throw new Error('Save text is too large');
 const data = JSON.parse(text);
 if (!data || !Array.isArray(data.grid) || data.grid.length !== cellCount ||
     data.grid.some(cell => !Number.isInteger(cell) || cell < 0 || cell >= tileCount) ||
     !Number.isSafeInteger(data.seed) || !data.factory || !Array.isArray(data.factory.m) ||
     data.factory.m.some(machine => !machine || typeof machine.kind !== 'string' ||
        !Number.isInteger(machine.x) || !Number.isInteger(machine.y))) {
  throw new Error('Paste a factory exported from the current game');
 }
 return data;
}
