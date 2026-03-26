export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");

  const API_KEY = process.env.FINNHUB_API_KEY;
  if (!API_KEY) return res.status(500).json({ error: "API key no configurada" });

  // Tickers en formato Finnhub (acciones US usan ticker directo)
  const TICKERS = ["BAESY","HIMS","AMD","GOOGL","ASTS","RKLB","IREN","ABCL","AMZN","TMDX","ONDS"];

  try {
    // Obtener EUR/USD primero
    const fxRes = await fetch(`https://finnhub.io/api/v1/forex/rates?base=USD&token=${API_KEY}`);
    const fxData = await fxRes.json();
    const eurUsd = fxData?.quote?.EUR ? 1 / fxData.quote.EUR : 1.08;

    // Obtener precios de todos los tickers en paralelo
    const results = await Promise.all(
      TICKERS.map(async (ticker) => {
        try {
          const r = await fetch(`https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${API_KEY}`);
          const d = await r.json();
          return { ticker, price: d.c, chg: d.dp, prev: d.pc };
        } catch {
          return { ticker, price: null, chg: null };
        }
      })
    );

    const prices = {};
    results.forEach(({ ticker, price, chg }) => {
      if (price && price > 0) {
        prices[ticker] = {
          eur: +(price / eurUsd).toFixed(2),
          usd: +price.toFixed(2),
          chg: chg != null ? +chg.toFixed(2) : null,
        };
      }
    });

    res.status(200).json({
      eurUsd: +eurUsd.toFixed(4),
      updatedAt: new Date().toISOString(),
      prices,
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
