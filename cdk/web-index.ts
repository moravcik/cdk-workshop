import { CustomResource, custom_resources } from 'aws-cdk-lib';
import { Role } from 'aws-cdk-lib/aws-iam';
import { Code, Runtime, SingletonFunction } from 'aws-cdk-lib/aws-lambda';
import { IBucket } from 'aws-cdk-lib/aws-s3';
import { ISource } from 'aws-cdk-lib/aws-s3-deployment';
import { Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { path as rootPath } from 'app-root-path';
import { readFileSync } from 'fs';
import { resolve } from 'path';

export interface WebDeploymentProps {
  bucket: IBucket;
  source: ISource;
  apiBaseUrl: string;
}

export class WebIndex extends Construct {
  constructor(scope: Construct, id: string, props: WebDeploymentProps) {
    super(scope, id);

    const handlerPath = resolve(rootPath, 'cdk/web-index-lambda.js');
    const handlerCode = readFileSync(handlerPath, 'utf8');

    const handler = new SingletonFunction(this, 'WebIndexLambda', {
      uuid: '4c84aa14-4077-11e9-bd73-47fe778e69cb',
      code: Code.fromInline(handlerCode),
      runtime: Runtime.NODEJS_LATEST,
      handler: 'index.handler',
      lambdaPurpose: 'Custom::CDKWebIndex',
      timeout: Duration.seconds(30)
    });

    props.bucket.grantReadWrite(handler);

    const { zipObjectKey } = props.source.bind(this, { handlerRole: handler.role as Role });

    const provider = new custom_resources.Provider(this, 'WebIndexProvider', {
      onEventHandler: handler
    });

    new CustomResource(this, 'CustomResource', {
      serviceToken: provider.serviceToken,
      resourceType: 'Custom::CDKWebIndex',
      properties: {
        ApiBaseUrl: props.apiBaseUrl,
        WebBucketName: props.bucket.bucketName,
        zipObjectKey
      }
    });

  }
}
