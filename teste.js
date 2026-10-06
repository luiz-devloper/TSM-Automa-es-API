// attacker-view.js
// Uso:
//   node attacker-view.js
//   TOKEN="seu-jwt" BODY='{"campo":"valor"}' node attacker-view.js
import { connect } from 'net';
import { connect as _connect } from 'tls';
import { request } from 'https';

const TARGET = process.env.URL ||
  'https://api-goalfy.tsmmonitoramento.com.br/api/automacoes/card/workOrder/7850d678-ec10-4080-9296-7d9b1438a9ca/procedure';
const TOKEN = process.env.TOKEN || 'TSM_37f4c9a2__LOYAL__e81d64b3f9c0a7__TOTAL__e5d2b8f6c13a94e7d0c5b2f8a61';
const BODY = process.env.BODY || '{"nome":"luiz teste"}';

const url = new URL(TARGET);
const port = Number(url.port || 443);
const payload = Buffer.from(BODY);

const headers = {
  'Content-Type': 'application/json',
  'Content-Length': payload.length,
  Accept: 'application/json',
};
if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;

// Dados sensíveis que, se um atacante conseguir ler em claro, é falha grave
const secrets = [url.pathname, BODY, TOKEN].filter(Boolean);

const raw = connect({ host: url.hostname, port });
const wireBytes = []; // TUDO que passa no cabo, nos dois sentidos, sem decriptar

const origWrite = raw.write.bind(raw);
raw.write = (chunk, ...args) => {
  wireBytes.push({ dir: '→ cliente->servidor', data: Buffer.from(chunk) });
  return origWrite(chunk, ...args);
};
raw.on('data', (d) => wireBytes.push({ dir: '← servidor->cliente', data: d }));

const secure = _connect({ socket: raw, servername: url.hostname });

secure.on('secureConnect', () => {
  const req = request({
    host: url.hostname,
    path: url.pathname + url.search,
    method: 'POST',
    headers,
    agent: false,
    createConnection: () => secure,
  }, (res) => {
    res.on('data', () => {});
    res.on('end', () => {
      console.log(`\n=========== O QUE UM ATACANTE NA REDE VERIA ===========`);
      console.log(`(capturando os bytes crus do cabo, sem ter a chave TLS)\n`);

      let totalBytes = 0;
      let anyLeak = false;

      wireBytes.forEach(({ dir, data }, i) => {
        totalBytes += data.length;
        const text = data.toString('latin1');
        const leaks = secrets.filter((s) => s && text.includes(s));
        if (leaks.length) anyLeak = true;

        console.log(`--- Pacote ${i + 1} ${dir} (${data.length} bytes) ---`);
        console.log(`hex : ${data.subarray(0, 64).toString('hex')}${data.length > 64 ? '...' : ''}`);
        console.log(`raw : ${JSON.stringify(text.slice(0, 120))}${text.length > 120 ? '...' : ''}`);
        if (leaks.length) {
          console.log(`  !! LEGÍVEL: encontrado em claro -> ${leaks.map((l) => `"${l.slice(0, 40)}"`).join(', ')}`);
        } else {
          console.log(`  ok: nenhum dado sensível legível (parece encriptado)`);
        }
        console.log();
      });

      console.log(`=========================================================`);
      console.log(`Total capturado: ${totalBytes} bytes em ${wireBytes.length} pacotes`);
      console.log(
        anyLeak
          ? `RESULTADO: VAZAMENTO — dados sensíveis trafegaram em texto puro!`
          : `RESULTADO: nada legível capturado — payload, path e token não aparecem em claro na rede (TLS está escondendo o conteúdo do atacante).`
      );
      console.log(`\nObs: o atacante NÃO vê status code, headers nem body da resposta —`);
      console.log(`isso só aparece decriptado aqui porque este script tem a sessão TLS.`);
    });
  });

  req.on('error', (e) => console.error('Erro na requisição:', e.message));
  req.write(payload);
  req.end();
});

secure.on('error', (e) => console.error('Erro TLS:', e.message));