import { MongoClient } from "mongodb";
import { Transfer } from "../schema/transferSchema.js";

export class TransferRepository {
  private client: MongoClient;
  private collection;
  private hasConnected = false;

  constructor() {
    const uri =
      process.env.MONGO_URL ?? process.env.MONGO_URI ?? "mongodb://localhost:27017/indexflow";
    const dbName = process.env.MONGO_DB ?? "indexflow";

    this.client = new MongoClient(uri);
    this.collection = this.client.db(dbName).collection("transfers");
  }

  async ensureConnected() {
    if (this.hasConnected) return;
    await this.client.connect();
    this.hasConnected = true;
  }

  async getRecent(count = 50): Promise<Transfer[]> {
    await this.ensureConnected();

    const docs = await this.collection
      .find({})
      .sort({ blockNumber: -1 })
      .limit(count)
      .toArray();

    // IMPORTANT: DO NOT validate response with Zod!
    return docs.map((doc) => {
      const { _id, ...rest } = doc;
      void _id;
      return rest as Transfer;
    });
  }
}

export const transferRepository = new TransferRepository();
