# IndexFlow PoC

Sepolia için ERC-20 transferlerini indeksleyen ve GraphQL API üzerinden sunan bir Proof of Concept. Indexer 500 blokluk batch'lerle en az 10.000 bloğu (ve sonrasında gelenleri) tarar, reorg toleransı için son 12 bloğu yeniden doğrular ve `/health` uç noktasıyla canlılık raporlar.

## Özellikler
- Docker Compose ile Postgres 16.
- Prisma şeması ve idempotent upsert tabanlı veri modeli.
- ethers tabanlı indexer: bloklar, işlemler ve ERC-20 `Transfer` logları.
- Apollo Server + GraphQL API (`transfers`, `block`, `health`, `batches` query'leri).
- Reorg toleransı (son 12 bloğun tekrar yazılması) ve basit exponential backoff.
- Batch başına Merkle root hesaplayıp `IndexedBatch` tablosuna yazan PoI hazırlığı.
- Çoklu ağ desteği: Sepolia, Base ve Polygon testnet verileri tek veritabanında `chainId` ile ayrıştırılmış olarak indekslenir.
- `PROVER_PRIVATE_KEY` sağlandığında indexer her batch'i imzalayıp `proverAddress/proverSignature` saklar.
- Verifier script'i Merkle root'u yeniden hesaplayıp `BatchAttestation` kayıtlarını oluşturur.
- Koordinatör servisi: epoch bazlı PoI skorlaması ve ödül payload hazırlığı.
- `multichain_fetch.js` ile Sepolia + Base/Polygon testnet gibi ağlardan hızlı ERC-20 transfer özetleri.
- Healthcheck: `GET /health` → `ok: <lastIndexedBlock>`.

## Önkoşullar
- Node.js 18 veya üzeri
- npm 9+
- Docker & Docker Compose

## Kurulum
```bash
cp .env.example .env
npm install
```

`.env` dosyasındaki `RPC_URL` değerini Sepolia sağlayıcınızla (Infura, Alchemy vb.) güncelleyin. Opsiyonel olarak:
- `CHAIN_IDS`: İndekslenmesini istediğiniz ağların listesi (`sepolia,base,polygon` gibi).
- `BASE_RPC_URL`, `POLYGON_RPC_URL`: Çoklu ağ desteği için ek RPC adresleri.
- `BASE_CONFIRMATIONS`, `POLYGON_CONFIRMATIONS`: İlgili ağlar için güvenli blok geriye çekme değerleri.
- `BASE_START_BLOCK`, `POLYGON_START_BLOCK`: Her ağ için başlangıç blokları.
- `BATCH_SIZE`, `POLL_INTERVAL_MS`: Indexer batch büyüklüğü ve döngü bekleme süresi.
- `PROVER_PRIVATE_KEY`: Indexer'ın batch imzalarını üretmesi için operatör cüzdanı.
- `VERIFIER_PRIVATE_KEY` ve `VERIFIER_ID`: Verifier script'inin attestation imzası için (ID verilmezse adres kullanılır).
- `VERIFIER_CHAIN_IDS`: Doğrulayıcının çalışacağı ağların listesi.
- `POI_BATCH_LIMIT`: Verifier'ın kaç batch'i kontrol edeceği (varsayılan 5).
- `MULTICHAIN_BLOCK_RANGE`: Çoklu ağ fetch script'inin kaç blok geriye bakacağı.
- `OPENAI_API_KEY`, `AI_MODEL`: AI sorgu sistemi için OpenAI bağlantı bilgileri.
- `COORDINATOR_EPOCH_MINUTES`, `COORDINATOR_INTERVAL_MS`, `COORDINATOR_SAMPLE_LIMIT`, `COORDINATOR_OUTPUT_PATH`, `COORDINATOR_RUN_ONCE`, `COORDINATOR_CHAINS`: Koordinatör servisi ayarları.

Varsayılan veritabanı bağlantısı host portu `5433` üzerinden map'lenmiştir; eğer farklı kullanmak isterseniz hem `.env` hem de `docker-compose.yml` içindeki port eşlemesini birlikte güncelleyin. `START_BLOCK` varsayılan olarak `5600000` (yaklaşık 10k bloğu arkadan indeksler).

## Komutlar
- `npm run db:up` → Postgres konteynerini başlatır.
- `npm run migrate` → Prisma migrasyonlarını uygular ve client üretir.
- `npm run index` → Indexer'ı başlatır; seçilen tüm ağlarda (örn. Sepolia, Base, Polygon) 500 blokluk batch'lerle güvenli bloklara kadar indeksler.
- `npm run api` → GraphQL API sunucusunu başlatır (`http://localhost:4000/graphql`).
- `npm run verifier` → Son PoI batch'lerini yeniden hesaplayıp Merkle root eşleşmesini doğrular ve `BatchAttestation` kayıtlarını günceller.
- `npm run multi:fetch` → `multichain_fetch.js` ile tanımlı tüm ağlardan belirlenen blok aralığı için ERC-20 transfer özetlerini toplar.
- `npm run ai:query -- "soru"` → LangChain destekli doğal dil → SQL sorgu çeviricisiyle Postgres verilerini sorgular (OpenAI anahtarı gerekir).
- `npm run coordinator` → Koordinatör servisini çalıştırır; epoch bazlı PoI raporlarını üretir ve skorları hesaplar.
- `npm run demo` → DB'yi kaldırır, migrasyon çalıştırır ve indexer + API'yi aynı anda başlatır.

Indexlama tamamlandıkça `src/indexer.ts` loglarında batch aralıkları ve kayıt sayıları görülür. En az 10.000 bloğun işlendiğini doğrulamak için healthcheck'teki blok numarasını kontrol edin.

## GraphQL
- Apollo Sandbox: http://localhost:4000/graphql

Örnek sorgular:

```graphql
query LatestTransfers {
  transfers(chainId: "sepolia", limit: 5) {
    chainId
    txHash
    token
    from
    to
    value
    blockNumber
  }
}
```

```graphql
query BlockDetails {
  block(chainId: "sepolia", number: 5601234) {
    chainId
    number
    hash
    timestamp
    txCount
  }
}
```

```graphql
query Health {
  health
}
```

```graphql
query RecentBatches {
  batches(chainId: "sepolia", limit: 5) {
    chainId
    id
    startBlock
    endBlock
    merkleRoot
    proverAddress
    totalTransfers
    proverSignature
    attestations {
      chainId
      attestor
      status
      signature
      createdAt
    }
    createdAt
  }
}
```

Healthcheck (REST):
```bash
curl http://localhost:4000/health
# ok: sepolia:<lastIndexedBlock>, base:<lastIndexedBlock>, ...
```

## Multichain Fetch
`multichain_fetch.js` script'i Sepolia'nın yanı sıra `.env` içinde tanımladığınız Base veya Polygon (Amoy/Mumbai) testnet RPC uç noktalarından son `MULTICHAIN_BLOCK_RANGE` blok içinde gerçekleşen ERC-20 transferlerini özetler (zincir kimlikleri indexer ile uyumludur: `sepolia`, `base`, `polygon`):
```bash
npm run multi:fetch
```
Çıktı her ağ için güvenli blok aralığını, transfer sayısını ve ilk birkaç örnek logu içerir. RPC limiti aşıldığında aralığı otomatik böler; daha küçük pencereler için `MULTICHAIN_BLOCK_RANGE` değerini düşürebilirsiniz.

## AI Query (LangChain + SQL Parser)
Doğal dil sorularını PostgreSQL üzerinde güvenli SELECT sorgularına çevirip çalıştırmak için:
```bash
npm run ai:query -- "En çok transfer alan 5 adresi göster"
```

Ön koşullar:
- `.env` içinde `OPENAI_API_KEY` ve tercihen `AI_MODEL` (varsayılan `gpt-4o-mini`).
- Script yalnızca SELECT sorgularına izin verir, SQL parser ile doğrular ve limit yoksa otomatik `LIMIT 100` ekler.
- Tablolarda `chainId` kolonları bulunur; çoklu ağ sorguları yaparken filtrelemek için `"chainId"` alanını kullanın.

Sonuçlar CLI'da oluşturulan SQL ve ilk satırlar olarak tablo biçiminde gösterilir.

## Coordinator Service
`src/coordinator.ts` epoch bazlı PoI skorlarını üretir, rastgele örnek batch'leri yeniden doğrular ve operatör/attestor performansını JSON payload olarak raporlar:
```bash
npm run coordinator
```

Varsayılan olarak her çalıştırmada mevcut epoch için rapor üretir ve `COORDINATOR_INTERVAL_MS` kadar bekleyerek döngüye devam eder. `COORDINATOR_RUN_ONCE=true` ile tek seferlik rapor alabilirsiniz. `COORDINATOR_OUTPUT_PATH` doluysa aynı data belirtilen dosyaya yazılır.

`COORDINATOR_CHAINS` parametresi hangi ağlar için rapor üretileceğini belirler; birden fazla ağ seçildiğinde çıktı ve opsiyonel JSON dosyası her `chainId` için ayrı raporlar içerir.

Skor formülü örnek olarak `weight = totalTransfers × (0.7 × attestationSuccess + 0.3 × verificationRatio)` kullanır; staking kontratına entegrasyon sırasında dilediğiniz gibi uyarlayabilirsiniz.

## Staking Contract Prototype
`contracts/` klasöründe Hardhat tabanlı bir prototip yer alır (`IndexFlowStaking.sol`). Özellikler:
- Operatör kaydı, self-stake ve komisyon oranı (`MAX_COMMISSION_BPS` %20).
- Delegator stake'leri, ödül paylaştırması ve `accRewardPerShare` modeli.
- `submitEpoch` ile koordinatörün ağırlıkla ödül dağıtması ve slashing uygulanması.
- Temel testler için `npx hardhat test --network hardhat`.

Çoklu ağ raporları (ör. `sepolia`, `base`) ayrı ayrı ele alınabilir; koordinatörden gelen her `chainId` için `submitEpoch` çağrısı yaparak zincir bazlı ödül havuzlarını besleyebilirsiniz.

Koordinatör çıktısını kontrata taşımak için:
1. Koordinatör doğrudan operatör listesi, ağırlıklar ve toplam ödülle `submitEpoch` çağırır (gerekirse ödül token'ı için `approve` yapılmalı).
2. Slashing listesi `slashList/ slashAmounts` parametreleriyle iletilir.
3. Operatörler `claimOperatorRewards`, delegator'lar `claimDelegatorRewards` fonksiyonlarıyla biriken ödülleri çeker.

## Sorun Giderme
- **RPC rate limit / timeout**: Sağlayıcı anahtarınızı yükseltin veya `.env` altındaki `START_BLOCK` ve batch aralığını ayarlayın (kodda `BATCH_SIZE` sabiti).
- **Postgres bağlantısı**: `docker compose ps` veya `docker compose logs db` ile konteynerin çalıştığından emin olun.
- **Migrasyon hatası**: `npm run migrate` öncesinde veritabanının temiz olduğundan emin olun; gerekiyorsa `docker compose down -v` komutuyla volume'u sıfırlayın.
- **Başlangıç bloğu çok yeni**: `START_BLOCK` değerini daha eski bir bloğa çekip indexer'ı yeniden başlatın.

## Sonraki Adımlar (TODO'lar)
1. `transfers` query'sine zaman aralığı filtresi ve cursor tabanlı pagination eklemek.
2. `GET /metrics` ile Prometheus metrikleri (`indexed_blocks_total`, `erc20_transfers_total`).
3. Koordinatör servisi ve staking/reward akıllı kontratı ile PoI attestasyonlarını zincire taşıyacak akışı tamamlamak.
