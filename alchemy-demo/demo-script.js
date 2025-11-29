'use strict';

const apiKey = process.env.ALCHEMY_API_KEY;

if (!apiKey) {
  console.error('Set ALCHEMY_API_KEY to your Alchemy key before running.');
  process.exit(1);
}

const url = `https://eth-sepolia.g.alchemy.com/v2/${apiKey}`;

const payload = {
  id: 1,
  jsonrpc: '2.0',
  method: 'eth_getBlockByNumber',
  params: ['finalized', false],
};

async function main() {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Alchemy request failed ${res.status}: ${text}`);
  }

  const json = await res.json();
  console.log(JSON.stringify(json, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
