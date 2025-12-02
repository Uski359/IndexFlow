import { MongoClient } from "mongodb";
import { Transfer, TransferSchema } from "../schema/transferSchema.js";

export class TransferRepository {
  private client: MongoClient;
  private collection;

  constructor() {
    const uri =
      process.env.MONGO_URL ?? process.env.MONGO_URI ?? "mongodb://localhost:27017/indexflow";
    const dbName = process.env.MONGO_DB ?? "indexflow";

    this.client = new MongoClient(uri);
    this.collection = this.client.db(dbName).collection("transfers");
  }

  async connect() {
    if (!this.client.topology) {
      await this.client.connect();
    }
  }

  async getRecent(count = 50): Promise<Transfer[]> {
    await this.connect();

    const docs = await this.collection
      .find({})
      .sort({ blockNumber: -1 })
      .limit(count)
      .toArray();

    return docs.map((d) => TransferSchema.parse(d));
  }
}
