import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import bodyParser from 'body-parser';
import cors from 'cors';
import express from 'express';
import { pathToFileURL } from 'node:url';

import { resolvers } from './graphql/resolvers.js';
import { typeDefs } from './graphql/schema.js';
import { buildSdkContext } from './sdk/index.js';

const DEFAULT_PORT = Number(process.env.PORT ?? 4000);

export async function createApolloServer() {
  const server = new ApolloServer({
    typeDefs,
    resolvers
  });

  await server.start();

  return server;
}

export async function startServer(port = DEFAULT_PORT) {
  const app = express();
  const apolloServer = await createApolloServer();

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'indexflow-sdk' });
  });

  app.use(
    '/graphql',
    cors(),
    bodyParser.json(),
    expressMiddleware(apolloServer, {
      context: async () => buildSdkContext()
    })
  );

  return new Promise<void>((resolve) => {
    app.listen(port, () => {
      console.log(`IndexFlow GraphQL server running on http://localhost:${port}/graphql`);
      resolve();
    });
  });
}

const isDirectExecution =
  typeof process !== 'undefined' &&
  process.argv[1] &&
  pathToFileURL(process.argv[1]).href === import.meta.url;

if (isDirectExecution) {
  startServer().catch((error) => {
    console.error('Failed to start server', error);
    process.exit(1);
  });
}
