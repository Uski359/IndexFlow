export const typeDefs = /* GraphQL */ `
  type ProofMetadata {
    dataset: String!
    merkleRoot: String!
    notes: String
  }

  type ProofOnChain {
    validatorActive: Boolean!
    validatorStake: String!
    pendingRewards: String!
  }

  type ProofData {
    id: ID!
    address: String!
    eventType: String!
    txHash: String!
    blockNumber: Int!
    validator: String!
    timestamp: String!
    status: String!
    confidence: Float!
    payloadHash: String!
    metadata: ProofMetadata!
    onChain: ProofOnChain
  }

  type Query {
    verifiedData(address: String, eventType: String): [ProofData!]!
  }
`;
