import { KeyValue, Page } from './types';
import { single, any, many, query } from '../db';
import { isJSON } from '../utils/json';
import mapToKeyValue from '../services/mapToKeyValue';
import getDescription from '../services/getDescription';

export interface Webhook {
  id: number;
  createdAt: Date;
  description: string;
  ipAddress: string;
  method: string;
  headers: KeyValue[];
  query: KeyValue[];
  contentType?: string;
  body?: string;
}

const map = (entity: any): Webhook | null =>
  entity === null
    ? null
    : {
        id: entity.id,
        createdAt: entity.created_at,
        description: getDescription(entity),
        ipAddress: entity.ip_address,
        method: entity.method,
        headers: mapToKeyValue(entity.headers),
        query: mapToKeyValue(entity.query),
        contentType: entity.content_type,
        body: entity.body,
      };

const includeGraph = `
  SELECT 
    w.id,
    w.created_at,
    w.endpoint_id,
    w.ip_address,
    w.method,
    w.headers,
    w.query,
    w.content_type,
    w.body,
    w.body_json
  FROM webhooks as w
`;

export const findById = async (id: number) =>
  map(await single(`${includeGraph} WHERE id = $1`, [id]));

export const findPage = async (
  endpointId: number,
  after?: number,
  limit: number = 500,
): Promise<Page<Webhook>> => {
  const parameters = [endpointId, limit + 1];
  const rows = await many(
    `
      ${includeGraph}
      WHERE endpoint_id = $1
        ${after ? 'AND id < $3' : ''}
      ORDER BY id DESC
      LIMIT $2
    `,
    after ? parameters.concat(after) : parameters,
  );

  const hasNextPage = rows.length > limit;
  const nodes = hasNextPage ? rows.slice(0, -1) : rows;
  return {
    nodes: nodes.map(n => map(n)!),
    pageInfo: {
      hasNextPage,
      endCursor: nodes.length ? nodes[nodes.length - 1].id : null,
    },
  };
};

export const isWebhookUser = async (
  webhookId: number,
  userId: number,
) =>
  await any(
    `
      SELECT w.id
      FROM webhooks as w
        INNER JOIN endpoints as e on e.id = w.endpoint_id
        INNER JOIN user_endpoints as ue on ue.endpoint_id = e.id
      WHERE
        w.id = $1
        AND
        ue.user_id = $2
    `,
    [webhookId, userId],
  );

export const insert = async (
  endpointId: number,
  ipAddress: string,
  method: string,
  headers: object,
  query: object,
  contentType: string | null,
  body: string | null,
) =>
  map(
    await single(
      `
        INSERT INTO webhooks
          (created_at, endpoint_id, ip_address, method, headers, query, content_type,  body, body_json)
        VALUES
          (current_timestamp, $1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `,
      [
        endpointId,
        ipAddress,
        method,
        headers,
        query,
        contentType,
        body,
        contentType === 'application/json' && isJSON(body)
          ? body
          : null, // Don't JSON.parse() before inserting, as that'll throw an exception for JSON arrays: https://github.com/brianc/node-postgres/issues/442
      ],
    ),
  );

export const updateRead = async (
  webhookId: number,
  userId: number,
  read: boolean,
) => {
  const q = read
    ? `
        INSERT INTO reads (webhook_id, user_id, created_at)
        SELECT $1, $2, current_timestamp
        WHERE NOT EXISTS (
          SELECT 1
          FROM reads
          WHERE webhook_id = $1 AND user_id = $2
        )
      `
    : `
        DELETE FROM reads
        WHERE webhook_id = $1 AND user_id = $2;
    `;
  const { rowCount } = await query(q, [webhookId, userId]);
  return rowCount;
};

export const deleteWebhooks = async (
  userId: number,
  endpointId: number,
  webhookIds: number[],
) => {
  const { rowCount } = await query(
    `
      DELETE FROM webhooks as w
      WHERE
        w.endpoint_id = $1
        AND
        w.id = ANY($2::int[])
        AND
        EXISTS (
          SELECT 1
          FROM endpoints as e
          INNER JOIN user_endpoints as ue on ue.endpoint_id = e.id
          WHERE e.id = w.endpoint_id AND ue.user_id = $3
        )
    `,
    [endpointId, webhookIds, userId],
  );
  return rowCount;
};
