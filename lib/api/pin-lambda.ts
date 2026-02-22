import { PutCommand, ScanCommand, GetCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { parse } from 'path';
import { v4 } from 'uuid';

import { dynamo } from "./utils/dynamo.utils";
import { deleteImageFromS3, resolveSignedUrl, saveImageToS3 } from './utils/s3.utils';
import { SavedImage, SavedPin, Pin } from '../shared/types/pin.types';
import { pointToUrl } from '../shared/utils/point.utils';

const pinTable = process.env.PIN_TABLE as string;

export async function handler(event: APIGatewayProxyEvent, context: Context) {
  context.callbackWaitsForEmptyEventLoop = false;

  const httpMethod = event.httpMethod.toUpperCase();
  const pointUrl = event.pathParameters && event.pathParameters.pointUrl;
  const sourceIp = context.identity && (context.identity as any).sourceIp;

  console.log(`pin API: ${httpMethod}:${event.path}`, pointUrl);

  if (httpMethod === 'POST' && !pointUrl) {
    return await handleSave(event, sourceIp);

  } else if (httpMethod === 'GET' && !pointUrl) {
    return await handleList();

  } else if (httpMethod === 'GET' && pointUrl) {
    return await handleGet(pointUrl);

  } else if (httpMethod === 'DELETE' && pointUrl) {
    return await handleDelete(pointUrl);

  } else {
    return transformResult({ statusCode: 404, body: { error: 'method/path not supported'} });
  }
}

// POST:/pin - body as Pin
async function handleSave(event: APIGatewayProxyEvent, sourceIp: string) {
  const pin = JSON.parse(event.body as string) as Pin;
  const { point, unsavedImage, ...pinFields } = pin;
  const pointUrl = pointToUrl(pin.point);

  const existingPinRecord = await getPinRecord(pointUrl);
  if (existingPinRecord) {
    return transformResult({ statusCode: 400, body: { error: 'pin already exists' }})
  }

  const created = Date.now();
  let savedImage: SavedImage | undefined = undefined;

  if (unsavedImage) {
    const { ext } = parse(unsavedImage.name);
    const s3key = `original/${pointUrl}_${v4()}${ext}`;
    savedImage = await saveImageToS3(s3key, unsavedImage);
  }
  const savedPin = { pointUrl, point, sourceIp, created, ...pinFields, image: savedImage } as SavedPin;

  console.log('Saving pin record', savedPin);
  await dynamo.send(new PutCommand({ TableName: pinTable, Item: savedPin }));

  const savedPinWithUrl = await resolveSignedUrl(savedPin);
  return transformResult({ body: savedPinWithUrl });
}

// GET:/pin
async function handleList() {
  const result = await dynamo.send(new ScanCommand({ TableName: pinTable }));
  const pinRecords = result.Items as SavedPin[];
  const pinsWithUrls = await Promise.all(pinRecords.map(pin => resolveSignedUrl(pin)));
  return transformResult({ body: pinsWithUrls });
}

// GET:/pin/{pointUrl}
async function handleGet(pointUrl: string) {
  const pinRecord = await getPinRecord(pointUrl);
  if (!pinRecord) {
    return transformResult({ statusCode: 404 });
  }
  const pinWithUrl = await resolveSignedUrl(pinRecord);
  return transformResult({ body: pinWithUrl });
}

// DELETE:/pin/{pointUrl}
async function handleDelete(pointUrl: string) {
  const pinRecord = await getPinRecord(pointUrl);
  if (!pinRecord) return transformResult({ statusCode: 404 });

  await deleteImageFromS3(pinRecord);

  console.log('Deleting pin record: ', pointUrl);
  await dynamo.send(new DeleteCommand({ TableName: pinTable, Key: { pointUrl } }));

  return transformResult({ statusCode: 204 });
}

// helper functions

function transformResult({ statusCode = 200, body = ''}: { statusCode?: number, body?: any } = {}) {
  console.log('pin API result', statusCode, body);
  return {
    statusCode,
    headers: { "Access-Control-Allow-Origin": "*" },
    body: typeof body === 'string' ? body : JSON.stringify(body)
  };
}

async function getPinRecord(pointUrl: string): Promise<SavedPin> {
  const result = await dynamo.send(new GetCommand({ TableName: pinTable, Key: { pointUrl } }));
  return result && result.Item as SavedPin;
}
