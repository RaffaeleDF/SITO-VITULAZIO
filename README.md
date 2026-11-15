# Natale ’Ndo Purton — mappa 3D isometrica

Prototipo della mappa interattiva delle postazioni: un plastico 3D (React, TypeScript,
Three.js, React Three Fiber) con il percorso a T ricavato dalla mappa enogastronomica.

```bash
npm install
npm run dev      # sviluppo su http://localhost:5173
npm run build    # sito statico in dist/ (percorsi relativi, pubblicabile anche in una sottocartella)
```

Parametro facoltativo: `?qualita=alta` oppure `?qualita=bassa` forza il livello grafico
(di default è automatico: bassa qualità su schermi piccoli o dispositivi con pochi core).

## Dove stanno i dati

Il codice grafico non contiene dati dell'evento: tutto arriva da due file JSON.

**`src/data/postazioni.json`**: una voce per postazione.

| campo | significato |
|---|---|
| `id` | identificativo univoco (usato internamente) |
| `numero` | numero mostrato su segnaposto e targa |
| `nome`, `descrizione` | testi della scheda |
| `categoria` | `enogastronomia` (segnaposto rosso), `evento` (verde) o `associazione` (dorato) |
| `posizione.strada` | id della strada in `percorso.json` |
| `posizione.lato` | `nord`, `sud` (vie est-ovest) oppure `est`, `ovest` (vie nord-sud) |
| `posizione.progressiva` | metri dall'inizio della strada al centro del portone |
| `casetta.modello` | `corte`, `timpano`, `bottega`, `torretta`, `portico`, `campanile` per gli stand; `babbo`, `oratorio`, `mostra` per gli eventi speciali; `sede` per l'associazione |
| `casetta.muro` / `casetta.portone` | nome del colore (vedi `MURI` e `PORTONI` in `src/map/build/materials.ts`) o un colore esadecimale |
| `menu` | elenco di voci `{ "nome": "...", "prezzo": "..." }` (vuoto = segnaposto "menu non ancora inserito") |
| `modello3d` | percorso di un file GLB che sostituisce la casetta procedurale (vedi sotto) |

**`src/data/percorso.json`**: geometria delle strade (punti di inizio e fine, larghezza,
marciapiede), punti di interesse (chiesa, bagni pubblici) e `monumenti`, cioè edifici senza
numero allineati sulle strade come le casette (oggi il campanile accanto alla Casa di Babbo
Natale: si sposta cambiando `progressiva`, si cambia aspetto con `modello`, `muro`, `portone`).
Unità in metri, X da ovest a est, Z da nord (negativo) a sud (positivo).

Le case di contorno, i giardini, i lampioni e le luminarie vengono disposti automaticamente
negli spazi lasciati liberi dalle postazioni: spostando uno stand nei dati la scena si riadatta.
Uno spazio libero diventa un giardinetto sotto i 4,4 m e una fila di case vuote sopra (una ogni
~6,2 m). `node scripts/verifica-casette.mjs` stampa che cosa verrà generato su ogni lato: utile
dopo aver cambiato una `progressiva` o la lunghezza di una strada.

## Sostituire una casetta con un modello GLB

1. Esportare il modello con l'origine al centro della facciata, a quota 0, con la facciata
   (e il portone) rivolta verso +Z; 1 unità = 1 metro.
2. Dare alle mesh del portone un nome che contenga `portone`: verranno evidenziate al passaggio del mouse.
3. Copiare il file in `public/models/` e indicare `"modello3d": "models/nome-file.glb"` nella postazione.

Segnaposto, area cliccabile e inquadratura restano quelli calcolati dai dati.

## Struttura

```
src/
  data/                  dati dell'evento (JSON)
  map/
    layout.ts            dati -> lotti nella scena (strade, lati, case di contorno)
    scene.ts             assemblaggio: strade, casette, decorazioni, plinto, aree cliccabili
    build/
      builder.ts         fusione delle geometrie per materiale (poche draw call)
      materials.ts       palette e texture procedurali (coppi, sanpietrini, lastre, prato)
      parts.ts           finestre, portoni, tetti, balconi, tende, festoni...
      houses.ts          modelli di casetta e case di contorno
      props.ts, decor.ts pacchi regalo, abeti, lampioni, luminarie, bici, Babbo Natale, chiesa
    CameraRig.tsx        telecamera ortografica: pan, zoom, avvicinamento, vista generale
    Stands.tsx           portoni interattivi, targhe e segnaposto numerati
    MapCanvas.tsx        luci, ombre, occlusione ambientale, post-produzione
  ui/                    intestazione, controlli, scheda, elenco postazioni
  state/store.ts         stato condiviso (postazione selezionata, comandi alla telecamera)
```

## Elementi provvisori

- Logo: è quello ufficiale (`public/logo.png`, ricavato dall'immagine fornita e reso trasparente), mostrato da `src/ui/Logo.tsx`.
- Descrizioni e menu: segnaposto, come richiesto.
- Nome della strada verso la Chiesa Madre: sulla cartina è poco leggibile; "Via dell’Agnena" va verificato.
- La disposizione segue la cartina (lato della strada e ordine delle postazioni), ma le distanze
  sono schematizzate e il tratto verso la chiesa è compresso.
- Le voci "Programma" e "Info" del menu non sono ancora collegate.
