import { App, Stack, StackProps } from '@aws-cdk/cdk';
import { Code, Function, Runtime } from '@aws-cdk/aws-lambda';
import { LambdaRestApi } from '@aws-cdk/aws-apigateway';

import { HitCounter } from './hitcounter';

export class CdkWorkshopStack extends Stack {
  constructor(scope: App, id: string, props?: StackProps) {
    super(scope, id, props);

    // defines an AWS Lambda resource
    const hello = new Function(this, 'HelloHandler', {
      runtime: Runtime.NodeJS810,
      code: Code.asset('packages/lambda/lib'),
      handler: 'hello.handler'
    });

    const helloWithCounter = new HitCounter(this, 'HelloHitCounter', {
      downstream: hello
    });

    // defines an API Gateway REST API resource backed by out "hello" function
    new LambdaRestApi(this, 'Endpoint', {
      handler: helloWithCounter.handler
    });
    
  }
}
