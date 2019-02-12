import { APIGatewayEvent } from 'aws-lambda';
import * as moment from 'moment';

export async function handler(event: APIGatewayEvent) {
  console.log('request:', JSON.stringify(event, undefined, 2));
  const now = moment();
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/plain' },
    body: `Hello, CDK! You've hit ${event.path} at ${now.format('YYYY-MM-DD HH:mm:ss')}\n`
  };
}
