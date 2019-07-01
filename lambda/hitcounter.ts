import { APIGatewayEvent } from 'aws-lambda';
import { DynamoDB, Lambda } from 'aws-sdk';

export async function handler(event: APIGatewayEvent) {
  console.log('request:', JSON.stringify(event, undefined, 2));

  // create AWS SDK clients
  const dynamo = new DynamoDB.DocumentClient();
  const lambda = new Lambda();

  // update dynamo entry for "path" with hits++
  await dynamo.update({
    TableName: process.env.HITS_TABLE_NAME as string,
    Key: { path: event.path },
    UpdateExpression: 'ADD hits :incr',
    ExpressionAttributeValues: { ':incr': 1 }
  }).promise();

  // call downstream function and capture response
  const resp = await lambda.invoke({
    FunctionName: process.env.DOWNSTREAM_FUNCTION_NAME as string,
    Payload: JSON.stringify(event)
  }).promise();
  
  console.log('downstream response:', JSON.stringify(resp, null, 2));

  // return response back to upstream caller
  return JSON.parse(resp.Payload as string);
}
