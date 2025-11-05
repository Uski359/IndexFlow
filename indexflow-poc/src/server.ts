import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { PrismaClient } from '@prisma/client';
import http from 'http';
import { schema, Context } from './schema';

const prisma = new PrismaClient();

async function startServer() {
  await prisma.$connect();

  const server = new ApolloServer<Context>({
    schema,
  });
  await server.start();

  const app = express();

  app.get('/health', async (_req, res) => {
    try {
      const summary = await prisma.block.groupBy({
        by: ['chainId'],
        _max: { number: true },
      });
      const status =
        summary.length === 0
          ? 'ok: empty'
          : `ok: ${summary
              .map((entry) => `${entry.chainId}:${entry._max.number ?? 'n/a'}`)
              .join(', ')}`;
      res.status(200).send(status);
    } catch (err) {
      console.error('Healthcheck failed', err);
      res.status(500).send('error');
    }
  });

  app.use(
    '/graphql',
    cors(),
    bodyParser.json(),
    expressMiddleware(server, {
      context: async (): Promise<Context> => ({ prisma }),
    }),
  );

  const port = Number.parseInt(process.env.PORT ?? '4000', 10);
  const httpServer = http.createServer(app);
  httpServer.listen(port, () => {
    console.log(`GraphQL ready at http://localhost:${port}/graphql`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start API server', err);
  process.exit(1);
});

const shutdown = async () => {
  console.log('Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
