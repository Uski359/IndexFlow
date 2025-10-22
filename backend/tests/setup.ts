process.env.NODE_ENV = 'test';
process.env.REQUEST_LOGGING = 'false';
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret';
process.env.CHAIN_RPC_URL =
  process.env.CHAIN_RPC_URL ?? 'https://sepolia.example-indexflow-rpc.invalid';
process.env.CHAIN_ID = process.env.CHAIN_ID ?? '11155111';
process.env.STAKE_TOKEN_ADDRESS =
  process.env.STAKE_TOKEN_ADDRESS ?? '0x0000000000000000000000000000000000000001';
process.env.REWARD_TOKEN_ADDRESS =
  process.env.REWARD_TOKEN_ADDRESS ?? '0x0000000000000000000000000000000000000002';
process.env.STAKE_CONTRACT_ADDRESS =
  process.env.STAKE_CONTRACT_ADDRESS ?? '0x0000000000000000000000000000000000000003';
process.env.ELASTIC_NODE = process.env.ELASTIC_NODE ?? 'http://localhost:19200';
process.env.ADMIN_WALLET_ADDRESSES =
  process.env.ADMIN_WALLET_ADDRESSES ?? '0xdeadbeefacdc,0xfeedface0001';
