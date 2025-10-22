import fetch from 'node-fetch';

const payload = '{"entryId":"dataset-cb2b8914-d67a-4607-a764-3f6820903a49","verifier":"0x26e00b3bBA422c14c2037a13E5aeDc9FCE286fBe","verdict":"approved","qualityScore":0.8,"sqlHash":"0x0164691dd21eef1c1f1e655e166d9047307f49f62f8763817e614bb5aa663976","poiHash":"0x411b5726a06d48d54a2bf8343bd5dc05bdc0a86eed26809e5a2b06ca2d44a6e7","notes":"Curator QA proof"}';
const signature = '0xf06bb5a5530921bd786e6bcd99fe041c52563dfcb2dfb98ddcb649651f2c2c64446d773e0903b267940b8c1bfbf315075200d8d5f69b98ccba4595c64b51c0f91b';

const res = await fetch('http://localhost:4000/api/verify/callback', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-validator-address': '0x26e00b3bBA422c14c2037a13E5aeDc9FCE286fBe',
    'x-validator-signature': signature
  },
  body: payload
});

console.log(res.status, await res.text());
