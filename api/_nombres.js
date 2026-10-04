// Mismo filtro que el juego (index.html): el servidor no se fía del navegador.
// El guion bajo evita que Vercel lo publique como ruta propia.
// ---- Filtro de nombres inapropiados (español e inglés) ----
// Detecta palabras sexuales, groserías, insultos y términos de odio aunque se
// escriban con mayúsculas, acentos, letras repetidas, separadas por puntos o
// espacios, partidas en varias palabras, o con números y símbolos en lugar de
// letras (CHUP4L0, CHUPA LO, P.U.T.4, $3XY, 4$$, KULO, PHUCK...). Para no
// bloquear nombres normales: las palabras cortas o ambiguas solo cuentan como
// palabra entera, y se ignoran las palabras corrientes que las contienen
// (computadora, cálculo, Essex, peacock...). Los emojis no se admiten.
const NOMBRES_MALOS = (function(){
  // en cualquier parte del nombre
  const dentro = [
    // inglés: sexual
    'fuck', 'fukk', 'fuker', 'fukin', 'fukoff', 'fukyo', 'fukme', 'fck', 'fvck', 'phuck', 'motherf', 'cock', 'dick', 'pussy', 'cunt',
    'penis', 'vagina', 'clitoris', 'porn', 'hentai', 'milf', 'dildo', 'orgasm', 'orgy', 'blowjob', 'handjob', 'rimjob', 'cumshot',
    'cumslut', 'jizz', 'masturba', 'horny', 'boob', 'titty', 'titties', 'nipple', 'slut', 'whore', 'skank', 'sex', 'nude', 'creampie',
    'bukkake', 'gangbang', 'threesome', 'butthole', 'buttplug', 'deepthroat', 'ballsack', 'scrotum', 'testicl', 'testicul', 'erection',
    'onlyfans', 'xvideos', 'xnxx', 'brazzers', 'nsfw', 'camgirl', 'incest', 'bestialit', 'pedophil', 'pedofil', 'zoofil', 'necrofil',
    'rapist', 'molester', 'molested', 'molesting', 'suckmy', 'suckit', 'blowme', 'eatmy', 'lickmy',
    // inglés: insultos y odio
    'shit', 'bitch', 'biatch', 'asshole', 'dumbass', 'jackass', 'fatass', 'bigass', 'asswipe', 'arsehole', 'bastard', 'twat', 'wank',
    'bollock', 'bellend', 'douche', 'scumbag', 'idiot', 'stupid', 'moronic', 'nigger', 'nigga', 'negrata', 'faggot', 'retard', 'tranny',
    'wetback', 'beaner', 'hitler', 'killyourself', 'killurself',
    // español: sexual
    'puta', 'puto', 'putit', 'verga', 'vergon', 'follar', 'chinga', 'chingon', 'coño', 'cojon', 'culiao', 'culiado', 'culero', 'culera',
    'mamahuevo', 'mamaguevo', 'mamalo', 'mamala', 'mamame', 'mamamela', 'chupalo', 'chupala', 'chupame', 'chupamela', 'chupapija',
    'chupapolla', 'chupaverga', 'chupahuevo', 'chupapito', 'pene', 'violacion', 'violador', 'desnud', 'orgasmo', 'esperma', 'eyacul',
    'puñeta', 'panocha', 'pechugona', 'pajero', 'pajera', 'pajillero', 'prostitut', 'ramera', 'conchetu', 'conchatu', 'conchesu', 'conchasu',
    'concha de tu', 'chichona', 'teton', 'tetotas', 'tetudo', 'tetuda',
    // español: insultos y odio
    'mierda', 'joder', 'pendej', 'cabron', 'maricon', 'malparid', 'malnacid', 'gilipolla', 'soplapolla', 'lameculo', 'imbecil', 'estupid',
    'boludo', 'boluda', 'pelotudo', 'pelotuda', 'huevon', 'huevona', 'weon', 'wevon', 'guevon', 'sorete', 'cornudo', 'carechimba',
    'gonorrea', 'mongolic', 'mogolic', 'subnormal', 'retrasad', 'tortillera', 'bollera', 'sudaca', 'muerete', 'matate', 'qlo', 'qliao', 'qlia',
    // a la madre de nadie
    'tumama', 'tumami', 'tumamita', 'tumadre', 'tuvieja', 'tuvieha', 'tuhermana', 'tumae', 'tumai', 'tumaire',
    'yomama', 'yomomma', 'yourmom', 'yourmum', 'yourmother', 'urmom', 'urmum', 'urmother', 'yomom', 'yamom', 'yamama'];
  // solo como palabra entera (dentro de otras serían falsos positivos)
  const enteras = ['ass', 'asses', 'arse', 'anal', 'anus', 'cum', 'tit', 'tits', 'hoe', 'hoes', 'fag', 'fags', 'fap', 'bj', 'rape', 'raped',
    'nazi', 'kkk', 'clit', 'semen', 'boner', 'thot', 'hooker', 'pimp', 'prick', 'tosser', 'moron', 'morons', 'spaz', 'spastic', 'chink',
    'spic', 'gook', 'coon', 'paki', 'kike', 'dyke', 'kys', 'gtfo', 'stfu', 'wtf', 'mf', 'mfer', 'pedo', 'nudes', 'suck', 'sucks', 'sucker',
    'culo', 'culos', 'culon', 'culona', 'tetas', 'teta', 'tetona', 'nalga', 'nalgas', 'chichis', 'pito', 'polla', 'pija', 'pinga',
    'zorra', 'perra', 'marica', 'joto', 'trolo', 'mamada', 'mamon', 'mamona', 'golfa', 'ojete', 'capullo', 'tarado', 'tarada', 'pinche',
    'cagon', 'mojon', 'caca', 'putas', 'putos', 'hdp', 'ctm', 'ctmr', 'ptm', 'ptmr', 'csm', 'mrd', 'vrg', 'pndj', 'wn'];
  // palabras corrientes que contienen alguna de las de arriba
  const sanas = ['computa', 'disputa', 'disputo', 'imputad', 'imputaci', 'reputaci', 'reputati', 'diputad', 'deputati', 'vergara', 'penelope', 'peneque',
    'sexto', 'sexta', 'sextant', 'sextet', 'essex', 'sussex', 'middlesex', 'unisex', 'bisexual', 'homosexual', 'heterosexual', 'asexual',
    'cocktail', 'peacock', 'hancock', 'cockpit', 'cockroach', 'hitchcock', 'woodcock', 'babcock', 'cockatoo', 'cockatiel',
    'shuttlecock', 'cockney', 'cockerel', 'dickens', 'dickson', 'dickinson', 'dickey', 'dickie', 'benedick', 'shiitake', 'shitake', 'shiitac', 'shitac',
    'therapist', 'scunthorpe', 'thorny', 'georgy', 'porgy', 'semental', 'nudel', 'retardant', 'open', 'booboo', 'amputa', 'putativ', 'computo', 'penistone',
    'ashita', 'mashita', 'ushita', 'ishita', 'oshita', 'shitara', 'sexag', 'sexen', 'swank', 'wankel', 'tetonia', 'happen', 'sharpen', 'pened', 'pener', 'penetr', 'reputab', 'vergonz', 'puñetaz'];
  // nombres y palabras corrientes que, enteras, se parecen a una de las cortas
  const exactas = ['assess', 'dicke', 'bonner', 'marika', 'mph'];
  const re = w => new RegExp(w.replace(/ /g, '').replace(/(.)\1*/g, (m, c)=> m.length > 1 ? c + '{' + m.length + ',}' : c + '+'));
  return { dentro: dentro.map(re), enteras: enteras.map(w => new RegExp('^' + re(w).source + '$')), sanas, exactas,
           largas: dentro.filter(w => w.replace(/ /g, '').length >= 6).map(re) };
})();
// Emojis, banderas, tonos de piel y sus uniones: fuera de los nombres.
const RE_EMOJI = /[\p{Extended_Pictographic}\p{Emoji_Presentation}‍︎️⃣\u{1F1E6}-\u{1F1FF}\u{1F3FB}-\u{1F3FF}\u{E0020}-\u{E007F}]/gu;
function tieneEmoji(n){ return String(n || '').replace(RE_EMOJI, '') !== String(n || ''); }
function quitaEmojis(n){ return String(n || '').replace(RE_EMOJI, ''); }
function nombreInapropiado(nombre){
  if (tieneEmoji(nombre)) return true;
  const crudo = String(nombre || '');
  if (/(^|[^0-9])69([^0-9]|$)/.test(crudo)) return true;               // el 69, suelto
  const base = crudo.toLowerCase().normalize('NFD').replace(/[̀-̂̄-ͯ]/g, '').normalize('NFC');
  const sim = { '@':'a', '4':'a', '8':'b', '3':'e', '€':'e', '6':'g', '9':'g', '0':'o', '5':'s', '$':'s', '7':'t', '+':'t', '2':'z', '!':'i', '¡':'i' };
  const variantes = [];
  for (const uno of ['i', 'l']){                           // el 1 y la barra pueden ser una i o una l
    let v = ''; for (const ch of base) v += ch === '1' || ch === '|' ? uno : (sim[ch] || ch);
    variantes.push(v, v.replace(/v/g, 'u'),                // la v, una u (pvta)
                   v.replace(/ph(?=[aeiouy])/g, 'f').replace(/k/g, 'c').replace(/q(?!u)/g, 'c'),   // ph, k y q por f y c (PHUCK, KULO, Q-LO)
                   v.replace(/w/g, 'hu'));                 // la w por hu (WEVON)
  }
  variantes.push(base.replace(/[0-9]+/g, ' '));            // los números, como relleno (CULO123)
  const entera = g => !NOMBRES_MALOS.exactas.includes(g) && NOMBRES_MALOS.enteras.some(r => r.test(g));
  const malo = g => {
    if (entera(g)) return true;
    let limpio = g;
    for (const s of NOMBRES_MALOS.sanas) limpio = limpio.split(s).join('|');
    return NOMBRES_MALOS.dentro.some(r => r.test(limpio));
  };
  for (const v of variantes){
    // trozos de letras; los de una o dos letras se juntan con los vecinos (P U T A, PU TA, PUT A, CHUPA LO)
    const trozos = v.split(/[^a-zñ]+/).filter(Boolean), grupos = [];
    for (const t of trozos){
      const g = grupos[grupos.length - 1];
      if (g && (t.length <= 2 || g.ultimo <= 2)){ g.txt += t; g.ultimo = t.length; }
      else grupos.push({ txt: t, ultimo: t.length });
    }
    const todo = trozos.join('');
    for (const g of grupos.map(x => x.txt).concat(todo.length <= 16 && trozos.every(t => t.length <= 2) ? [todo] : [])) if (malo(g)) return true;
    for (const t of trozos) if (entera(t)) return true;
    // palabras partidas en varias (CHU PALO, MIER DA): se miran juntas, solo con las palabras largas
    if (trozos.length > 1){
      let limpio = todo;
      for (const s of NOMBRES_MALOS.sanas) limpio = limpio.split(s).join('|');
      if (NOMBRES_MALOS.largas.some(r => r.test(limpio))) return true;
    }
  }
  return false;
}

export { nombreInapropiado, tieneEmoji, quitaEmojis };
