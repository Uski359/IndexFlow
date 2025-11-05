import 'dotenv/config';
import { Pool } from 'pg';
import { Parser } from 'node-sql-parser';
import { PromptTemplate } from '@langchain/core/prompts';
import { ChatOpenAI } from '@langchain/openai';
import { StringOutputParser } from '@langchain/core/output_parsers';

const question = process.argv.slice(2).join(' ').trim();

if (!question) {
  console.error(
    'Usage: npm run ai:query -- "<natural language question>"\nExample: npm run ai:query -- "En çok transfer alan 5 adresi göster"',
  );
  process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL not set. Check your .env file.');
  process.exit(1);
}

const openAiKey = process.env.OPENAI_API_KEY;
if (!openAiKey) {
  console.error('OPENAI_API_KEY not set. Add it to your .env to enable AI querying.');
  process.exit(1);
}

const modelName = process.env.AI_MODEL ?? 'gpt-4o-mini';

const schemaDescription = `
Table Block(
  chainId TEXT,
  number INT,
  hash TEXT,
  parentHash TEXT,
  timestamp BIGINT,
  createdAt TIMESTAMP,
  PRIMARY KEY (chainId, number),
  UNIQUE (chainId, hash)
)

Table Transaction(
  chainId TEXT,
  hash TEXT,
  blockNumber INT,
  from TEXT,
  to TEXT,
  value TEXT,
  createdAt TIMESTAMP,
  PRIMARY KEY (chainId, hash),
  FOREIGN KEY (chainId, blockNumber) REFERENCES Block(chainId, number)
)

Table Erc20Transfer(
  chainId TEXT,
  id TEXT,
  txHash TEXT,
  logIndex INT,
  blockNumber INT,
  token TEXT,
  from TEXT,
  to TEXT,
  value TEXT,
  createdAt TIMESTAMP,
  PRIMARY KEY (chainId, id),
  FOREIGN KEY (chainId, txHash) REFERENCES Transaction(chainId, hash),
  FOREIGN KEY (chainId, blockNumber) REFERENCES Block(chainId, number)
)

Table IndexedBatch(
  chainId TEXT,
  id TEXT,
  startBlock INT,
  endBlock INT,
  merkleRoot TEXT,
  totalBlocks INT,
  totalTransactions INT,
  totalTransfers INT,
  proverAddress TEXT,
  proverSignature TEXT,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP,
  PRIMARY KEY (chainId, id),
  UNIQUE (chainId, startBlock, endBlock)
)

Table BatchAttestation(
  chainId TEXT,
  id TEXT,
  batchId TEXT,
  attestor TEXT,
  merkleRoot TEXT,
  status TEXT,
  signature TEXT,
  createdAt TIMESTAMP,
  PRIMARY KEY (chainId, id),
  FOREIGN KEY (chainId, batchId) REFERENCES IndexedBatch(chainId, id)
)
`;

const prompt = new PromptTemplate({
  template: `
You are an assistant that writes safe SQL queries for a PostgreSQL database.
You MUST follow the rules below:
- Only generate SELECT queries.
- Never modify data.
- Prefer aggregated answers when appropriate.
- Always include an ORDER BY when using LIMIT without aggregation.
- Do not guess column or table names outside the schema.
- When referencing tables or columns that use capital letters or reserved keywords, wrap them in double quotes (e.g. "Erc20Transfer", "Block", "IndexedBatch", "from", "to").
- If the question cannot be answered with the schema, respond with "SELECT 'Unable to answer with given schema' AS message".
- Return ONLY raw SQL without commentary or code fences.

Schema:
{schema}

Question: {question}
SQL:`,
  inputVariables: ['schema', 'question'],
});

const model = new ChatOpenAI({
  apiKey: openAiKey,
  modelName,
  temperature: 0,
});

const chain = prompt.pipe(model).pipe(new StringOutputParser());

function stripCodeFences(sql: string): string {
  return sql.replace(/```sql/gi, '').replace(/```/g, '').trim();
}

const TABLE_NAMES = ['Block', 'Transaction', 'Erc20Transfer', 'IndexedBatch', 'BatchAttestation'];

function quoteKnownTables(sql: string): string {
  let result = sql;
  for (const table of TABLE_NAMES) {
    const pattern = new RegExp(`(?<!")\\b${table}\\b(?!")`, 'g');
    result = result.replace(pattern, `"${table}"`);
  }
  return result;
}

function ensureSelectQueries(sql: string): { sanitizedSql: string; hasLimit: boolean } {
  const parser = new Parser();
  const trimmed = sql.replace(/;+\s*$/, '').trim();
  if (!trimmed) {
    throw new Error('Model returned empty SQL.');
  }

  const ast = parser.astify(trimmed, { database: 'postgresql' });
  const statements = Array.isArray(ast) ? ast : [ast];

  let hasLimit = false;

  for (const statement of statements) {
    if (statement.type !== 'select') {
      throw new Error('Only SELECT statements are permitted.');
    }
    if (statement.limit) {
      hasLimit = true;
    }
  }

  return { sanitizedSql: trimmed, hasLimit };
}

async function main() {
  console.log(`Question: ${question}`);
  const rawSql = await chain.invoke({ schema: schemaDescription, question });
  const sqlBody = quoteKnownTables(stripCodeFences(rawSql));

  let { sanitizedSql, hasLimit } = ensureSelectQueries(sqlBody);
  if (!hasLimit) {
    sanitizedSql = `${sanitizedSql} LIMIT 100`;
    ({ sanitizedSql, hasLimit } = ensureSelectQueries(sanitizedSql));
  }

  console.log(`Generated SQL:\n${sanitizedSql}`);

  const pool = new Pool({ connectionString: databaseUrl });
  try {
    const result = await pool.query(sanitizedSql);
    console.log(`Rows returned: ${result.rowCount}`);
    if (result.rows.length > 0) {
      console.table(result.rows);
    }
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  if (err instanceof Error) {
    console.error('AI query failed:', err.message);
    if (err.stack) {
      console.error(err.stack);
    }
  } else {
    console.error('AI query failed:', err);
  }
  process.exit(1);
});
