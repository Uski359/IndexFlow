## IndexFlow Test Checklist

1) Indexer running  
- `npm run indexer:listener:sepolia` prints blocks  
- `db.transfers.count()` > 0  

2) Backend running  
- `GET /api/health?chain=sepolia` → synced:true  
- `GET /api/transfers/latest` → returns array  

3) Frontend running  
- Supply shows number  
- Holders > 0  
- Throughput shows "Live"  
- Latest transfers visible  
- Indexer Health block number matches backend  

4) Cross-chain  
- Switching chain in UI doesn't break  
- Chains with null tokenAddress show empty state  
