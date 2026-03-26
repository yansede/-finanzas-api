export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");

  const TICKERS = "BAESY,HIMS,AMD,GOOGL,ASTS,RKLB,IREN,ABCL,AMZN,TMDX,ONDS,EURUSD=X";

  try {
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${TICKERS}&fields=regularMarketPrice,regularMarketChangePercent,shortName`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
      },
    });

    if (!response.ok) throw new Error(`Yahoo Finance error: ${response.status}`);

    const data = await response.json();
    const quotes = data?.quoteResponse?.result || [];

    let eurUsd = 1.08;
    const prices = {};

    quotes.forEach((q) => {
      if (q.symbol === "EURUSD=X") {
        eurUsd = q.regularMarketPrice || 1.08;
        return;
      }
      prices[q.symbol] = {
        usd: q.regularMarketPrice,
        chg: q.regularMarketChangePercent ?? null,
        name: q.shortName,
      };
    });

    const result = {
      eurUsd,
      updatedAt: new Date().toISOString(),
      prices: {},
    };

    Object.entries(prices).forEach(([symbol, d]) => {
      result.prices[symbol] = {
        eur: +(d.usd / eurUsd).toFixed(2),
        usd: +d.usd.toFixed(2),
        chg: d.chg !== null ? +d.chg.toFixed(2) : null,
        name: d.name,
      };
    });

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
