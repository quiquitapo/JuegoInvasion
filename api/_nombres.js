// Mismo filtro que el juego (index.html): el servidor no se fía del navegador.
// El guion bajo evita que Vercel lo publique como ruta propia.
// ---- Filtro de nombres inapropiados (español e inglés) ----
// Detecta palabras sexuales, groserías e insultos aunque se escriban con
// mayúsculas, acentos, letras repetidas, separadas por puntos o espacios, o
// con números y símbolos en lugar de letras (P.U.T.4, $3XY, 4$$...). Para no
// bloquear nombres normales: las palabras cortas o ambiguas solo cuentan como
// palabra entera, y se ignoran las palabras corrientes que las contienen
// (computadora, cálculo, Essex, peacock...).
const NOMBRES_MALOS = (function(){
  // en cualquier parte del nombre
  const dentro = ['fuck', 'fukk', 'fuker', 'fukin', 'fukoff', 'fukyo', 'fukme', 'fck', 'fvck', 'phuck', 'motherf', 'shit', 'bitch', 'biatch', 'cunt', 'dick', 'cock', 'pussy',
    'penis', 'vagina', 'clitoris', 'porn', 'hentai', 'milf', 'dildo', 'orgasm', 'orgy', 'blowjob', 'handjob', 'cumshot', 'jizz',
    'masturba', 'horny', 'boob', 'titty', 'titties', 'nipple', 'slut', 'whore', 'rapist', 'asshole', 'dumbass', 'jackass', 'fatass',
    'bigass', 'asswipe', 'nigger', 'nigga', 'faggot', 'retard', 'hitler', 'sex', 'nude',
    'puta', 'puto', 'verga', 'mierda', 'joder', 'follar', 'chinga', 'pendej', 'cabron', 'maricon', 'coño', 'cojon', 'culiao',
    'culiado', 'mamahuevo', 'mamaguevo', 'malparid', 'violacion', 'violador', 'desnud', 'pene', 'chupamela', 'chupala', 'orgasmo'];
  // solo como palabra entera (dentro de otras serían falsos positivos)
  const enteras = ['ass', 'asses', 'arse', 'anal', 'anus', 'cum', 'tit', 'tits', 'hoe', 'hoes', 'fag', 'fap', 'bj', 'rape', 'raped',
    'nazi', 'kkk', 'clit', 'semen', 'culo', 'culos', 'tetas', 'teta', 'pito', 'polla', 'pija', 'zorra', 'perra', 'marica', 'pinga',
    'mamada', 'hdp', 'ctm', 'ptm', 'csm', 'wtf', 'stfu', 'nudes', 'tetona', 'culona', 'putas', 'putos'];
  // palabras corrientes que contienen alguna de las de arriba
  const sanas = ['computa', 'disputa', 'disputo', 'imputad', 'imputaci', 'reputaci', 'reputati', 'diputad', 'deputati', 'vergara', 'penelope', 'peneque',
    'sexto', 'sexta', 'sextant', 'sextet', 'essex', 'sussex', 'middlesex', 'unisex', 'bisexual', 'homosexual', 'heterosexual', 'asexual',
    'cocktail', 'peacock', 'hancock', 'cockpit', 'cockroach', 'hitchcock', 'woodcock', 'babcock', 'cockatoo', 'cockatiel',
    'shuttlecock', 'cockney', 'cockerel', 'dickens', 'dickson', 'dickinson', 'dickey', 'dickie', 'benedick', 'shiitake', 'shitake',
    'therapist', 'scunthorpe', 'thorny', 'georgy', 'porgy', 'semental', 'nudel', 'retardant', 'open', 'booboo', 'amputa', 'putativ', 'computo', 'penistone',
    'ashita', 'mashita', 'ushita', 'ishita', 'oshita', 'shitara', 'sexag', 'sexen'];
  const re = w => new RegExp(w.replace(/(.)\1*/g, (m, c)=> m.length > 1 ? c + '{' + m.length + ',}' : c + '+'));
  return { dentro: dentro.map(re), enteras: enteras.map(w => new RegExp('^' + re(w).source + '$')), sanas };
})();
function nombreInapropiado(nombre){
  const base = String(nombre || '').toLowerCase().normalize('NFD').replace(/[̀-̂̄-ͯ]/g, '').normalize('NFC');
  const sim = { '@':'a', '4':'a', '8':'b', '3':'e', '€':'e', '6':'g', '9':'g', '0':'o', '5':'s', '$':'s', '7':'t', '+':'t', '2':'z', '!':'i', '¡':'i' };
  const variantes = [];
  for (const uno of ['i', 'l']){                           // el 1 y la barra pueden ser una i o una l
    let v = ''; for (const ch of base) v += ch === '1' || ch === '|' ? uno : (sim[ch] || ch);
    variantes.push(v, v.replace(/v/g, 'u'));               // y la v, una u (pvta)
  }
  variantes.push(base.replace(/[0-9]+/g, ' '));            // los números, como relleno (CULO123)
  for (const v of variantes){
    // trozos de letras; los de una o dos letras se juntan con los vecinos (P U T A, PU TA, PUT A)
    const trozos = v.split(/[^a-zñ]+/).filter(Boolean), grupos = [];
    for (const t of trozos){
      const g = grupos[grupos.length - 1];
      if (g && (t.length <= 2 || g.ultimo <= 2)){ g.txt += t; g.ultimo = t.length; }
      else grupos.push({ txt: t, ultimo: t.length });
    }
    const todo = trozos.join('');
    for (const g of grupos.map(x => x.txt).concat(todo.length <= 14 && trozos.every(t => t.length <= 2) ? [todo] : [])){
      if (NOMBRES_MALOS.enteras.some(r => r.test(g))) return true;
      let limpio = g;
      for (const s of NOMBRES_MALOS.sanas) limpio = limpio.split(s).join('|');
      if (NOMBRES_MALOS.dentro.some(r => r.test(limpio))) return true;
    }
    for (const t of trozos) if (NOMBRES_MALOS.enteras.some(r => r.test(t))) return true;
  }
  return false;
}

export { nombreInapropiado };
