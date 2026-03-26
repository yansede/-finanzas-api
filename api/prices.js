export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");

  const TICKERS = "BAESY,HIMS,AMD,GOOGL,ASTS,RKLB,IREN,ABCL,AMZN,TMDX,ONDS,EURUSD=X";

  const HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Origin": "https://finance.yahoo.com",
    "Referer": "https://finance.yahoo.com/",
  };

  // Try multiple Yahoo Finance endpoints
  const ENDPOINTS = [
    `https://query2.finance.yahoo.com/v8/finance/quote?symbols=${TICKERS}&fields=regularMarketPrice,regularMarketChangePercent,shortName`,
    `https://query1.finance.yahoo.com/v8/finance/quote?symbols=${TICKERS}&fields=regularMarketPrice,regularMarketChangePercent,shortName`,
    `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${TICKERS}`,
    `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${TICKERS}`,
  ];

  let quotes = [];

  for (const endpoint of ENDPOINTS) {
    try {
      const response = await fetch(endpoint, { headers: HEADERS });
      if (!response.ok) continue;
      const data = await response.json();
      const result = data?.quoteResponse?.result || [];
      if (result.length > 0) {
        quotes = result;
        break;
      }
    } catch {
      continue;
    }
  }

  if (quotes.length === 0) {
    return res.status(500).json({ error: "No se pudieron obtener precios de Yahoo Finance" });
  }

  let eurUsd = 1.08;
  const prices = {};

  quotes.forEach((q) => {
    if (q.symbol === "EURUSD=X") {
      eurUsd = q.regularMarketPrice || 1.08;
      return;
    }
    if (q.regularMarketPrice) {
      prices[q.symbol] = {
        usd: q.regularMarketPrice,
        chg: q.regularMarketChangePercent ?? null,
        name: q.shortName || q.symbol,
      };
    }
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
}
