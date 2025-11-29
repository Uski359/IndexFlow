/* eslint-disable */
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type Maybe<T> = T | null;
export type InputMaybe<T> = T | null | undefined;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  BigInt: { input: any; output: any; }
};

export type Block = {
  __typename?: 'Block';
  chainId: Scalars['String']['output'];
  number: Scalars['Int']['output'];
};

export type Query = {
  __typename?: 'Query';
  latestBlock?: Maybe<Block>;
  transfers: TransferConnection;
};


export type QueryTransfersArgs = {
  cursor?: InputMaybe<Scalars['String']['input']>;
  direction?: InputMaybe<SortDirection>;
  limit?: InputMaybe<Scalars['Int']['input']>;
};

export enum SortDirection {
  Asc = 'ASC',
  Desc = 'DESC'
}

export type Transfer = {
  __typename?: 'Transfer';
  blockNumber: Scalars['Int']['output'];
  from: Scalars['String']['output'];
  id: Scalars['String']['output'];
  to: Scalars['String']['output'];
  txHash: Scalars['String']['output'];
  value: Scalars['String']['output'];
};

export type TransferConnection = {
  __typename?: 'TransferConnection';
  items: Array<Transfer>;
  nextCursor?: Maybe<Scalars['String']['output']>;
};

export type DemoPageQueryVariables = Exact<{
  limit: Scalars['Int']['input'];
}>;


export type DemoPageQuery = { __typename?: 'Query', latestBlock?: { __typename?: 'Block', number: number, chainId: string } | null, transfers: { __typename?: 'TransferConnection', nextCursor?: string | null, items: Array<{ __typename?: 'Transfer', id: string, from: string, to: string, value: string, blockNumber: number, txHash: string }> } };


export const DemoPageDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"DemoPage"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"latestBlock"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"number"}},{"kind":"Field","name":{"kind":"Name","value":"chainId"}}]}},{"kind":"Field","name":{"kind":"Name","value":"transfers"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}},{"kind":"Argument","name":{"kind":"Name","value":"direction"},"value":{"kind":"EnumValue","value":"DESC"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"from"}},{"kind":"Field","name":{"kind":"Name","value":"to"}},{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"blockNumber"}},{"kind":"Field","name":{"kind":"Name","value":"txHash"}}]}},{"kind":"Field","name":{"kind":"Name","value":"nextCursor"}}]}}]}}]} as unknown as DocumentNode<DemoPageQuery, DemoPageQueryVariables>;