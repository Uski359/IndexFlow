import { randomUUID } from 'crypto';

import {
  Challenge,
  Dataset,
  RewardSummary,
  StakePosition,
  VerificationResult
} from '../types/protocol.js';

export const datasets: Dataset[] = [];

export const stakes: StakePosition[] = [];

export const verificationResults: VerificationResult[] = [];

export const rewardSummary: RewardSummary = {
  address: 'network',
  pending: 0,
  lifetime: 0,
  latestDistributions: []
};

export const challenges: Challenge[] = [];

export function addDataset(dataset: Dataset) {
  datasets.push(dataset);
  return dataset;
}

export function upsertStake(position: StakePosition) {
  const index = stakes.findIndex((stake) => stake.id === position.id);
  if (index >= 0) {
    stakes[index] = position;
  } else {
    stakes.push(position);
  }
  return position;
}

export function createStakeId() {
  return `stake-${randomUUID()}`;
}

export function createChallengeId() {
  return `challenge-${randomUUID()}`;
}

export function searchDatasetsLocally(query: string) {
  if (!query) {
    return datasets;
  }

  const lowered = query.toLowerCase();

  return datasets.filter((dataset) => {
    const haystacks = [
      dataset.metadata.name,
      dataset.metadata.description,
      dataset.metadata.tags.join(' '),
      dataset.hash
    ].join(' ');

    return haystacks.toLowerCase().includes(lowered);
  });
}

const polymarketBaseWallets = [
  '0xdbf16bcffa41bd95faec2640daa2c95ab2bd86b5',
  '0xed107a85a4585a381e48c7f7ca4144909e7dd2e5',
  '0x492442eab586f242b53bda933fd5de859c8a3782',
  '0x2785e7022dc20757108204b13c08cea8613b70ae',
  '0x6b7ec4ba079c0a258435ea36025f6190cd424562',
  '0x4cc3522b689a6bf1fb4a2444c523e7776db47552',
  '0x2bace940278da373e37fcf5c5576ecb41290f238',
  '0x30e443872ddf63b2908a49f92cd690c304a55102',
  '0xa49becb692927d455924583b5e3e5788246f4c40',
  '0x44c1dfe43260c94ed4f1d00de2e1f80fb113ebc1',
  '0xa2f1fecf1cc7db65a46588f764b6691533052d22',
  '0xee00ba338c59557141789b127927a55f5cc5cea1',
  '0x0c0e270cf879583d6a0142fc817e05b768d0434e',
  '0xbdd11cc911ec8ed95887e56dc253d70cb36b0c4f',
  '0xd1c769317bd15de7768a70d0214cf0bbcc531d2b',
  '0xecdbd79566a25693b9971c48d7de84bc05f7da79',
  '0xfffe4013adfe325c6e02d36dc66e091f5476f52c',
  '0x6d57da09ef86a327524853b36fbd2e39cf0cbfc5',
  '0x351a72160e477863d13666c62ef1e7631b3940bb',
  '0xc2e7800b5af46e6093872b177b7a5e7f0563be51',
  '0x8e5a5d37a354f4e05badd0d9e91b519774e44ef5',
  '0xc6587b11a2209e46dfe3928b31c5514a8e33b784',
  '0x8a4c788f043023b8b28a762216d037e9f148532b',
  '0x5ecde7348ea5100af4360dd7a6e0a3fb1d420787',
  '0x1521b47bf0c41f6b7fd3ad41cdec566812c8f23e'
];

export function generatePolymarketPilotDataset() {
  const dataset: Array<{
    id: string;
    address: string;
    score: number;
    sybilRisk: 'Low' | 'High';
    metadata: {
      fundingSource: string;
      activeDays: number;
      avgBetSize: number;
      simultaneousTx: boolean;
    };
  }> = [];

  // 1. DÖNGÜ: 25 cüzdan x 10 varyasyon = EXACTLY 250 Gerçek Kullanıcı
  polymarketBaseWallets.forEach((wallet, index) => {
    for (let i = 0; i < 10; i++) { // <-- Burası 10 kalacak!
      const uniqueSuffix = i.toString(16).padStart(3, '0');
      const generatedAddress = wallet.substring(0, 39) + uniqueSuffix;

      dataset.push({
        id: `user-${index}-${i}`,
        address: generatedAddress,
        score: Math.floor(Math.random() * (100 - 70) + 70),
        sybilRisk: 'Low',
        metadata: {
          fundingSource: index % 2 === 0 ? 'Binance' : 'Coinbase',
          activeDays: Math.floor(Math.random() * (200 - 30) + 30),
          avgBetSize: Math.floor(Math.random() * (5000 - 100) + 100),
          simultaneousTx: false
        }
      });
    }
  });

  // 2. DÖNGÜ: 70 Organize Bot Üretimi
  for (let i = 0; i < 70; i++) {
    const botSuffix = i.toString().padStart(3, '0');
    const botAddress = `0x9999sybilclusterwalletforyou320${botSuffix}`.substring(0, 42);

    dataset.push({
      id: `bot-${i}`,
      address: botAddress,
      score: Math.floor(Math.random() * 20),
      sybilRisk: 'High',
      metadata: {
        fundingSource: '0xSharedSybilClusterWallet',
        activeDays: 1,
        avgBetSize: 5,
        simultaneousTx: true
      }
    });
  }

  return dataset;
}