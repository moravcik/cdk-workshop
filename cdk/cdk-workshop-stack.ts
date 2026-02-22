import { LambdaIntegration, RestApi } from 'aws-cdk-lib/aws-apigateway';
import {
  CacheHeaderBehavior,
  CachePolicy,
  CacheQueryStringBehavior,
  Distribution,
  PriceClass
} from 'aws-cdk-lib/aws-cloudfront';
import { S3StaticWebsiteOrigin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { CfnOutput, Duration, RemovalPolicy, Stack, StackProps, Tags } from 'aws-cdk-lib';
import { AttributeType, BillingMode, Table } from 'aws-cdk-lib/aws-dynamodb';
import { Architecture, Code, LayerVersion, Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Bucket, EventType, ObjectOwnership } from 'aws-cdk-lib/aws-s3';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import { LambdaDestination } from 'aws-cdk-lib/aws-s3-notifications';
import { Construct } from 'constructs';
import { path as rootPath } from 'app-root-path';
import { resolve } from 'path';

import { addCorsOptions } from './cors.utils';
import { WebIndex } from './web-index';

export interface CdkWorkshopStackProps extends StackProps {
  userName: string;
}

export class CdkWorkshopStack extends Stack {
  constructor(scope: Construct, id: string, props: CdkWorkshopStackProps) {
    super(scope, id, props);

    // Tags
    const tags = Tags.of(scope);
    tags.add('language', 'TypeScript');
    tags.add('team', 'webapps');
    tags.add('app', 'CDK workshop');

    // API

    const imageBucket = new Bucket(this, 'ImageBucket', {
      blockPublicAccess: {
        blockPublicAcls: false,
        blockPublicPolicy: true,
        ignorePublicAcls: false,
        restrictPublicBuckets: true
      },
      objectOwnership: ObjectOwnership.OBJECT_WRITER,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const pinTable = new Table(this, 'PinTable', {
      partitionKey: {
        name: 'pointUrl',
        type: AttributeType.STRING
      },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY
    });

    const helloHandler = new NodejsFunction(this, 'HelloHandler', {
      entry: resolve(rootPath, 'lib/api/hello-lambda.ts'),
      runtime: Runtime.NODEJS_LATEST,
      architecture: Architecture.ARM_64,
      bundling: { externalModules: ['@aws-sdk'] }
    });

    const pinHandler = new NodejsFunction(this, 'PinHandler', {
      entry: resolve(rootPath, 'lib/api/pin-lambda.ts'),
      runtime: Runtime.NODEJS_LATEST,
      architecture: Architecture.ARM_64,
      bundling: { externalModules: ['@aws-sdk'] },
      environment: {
        IMAGE_BUCKET: imageBucket.bucketName,
        PIN_TABLE: pinTable.tableName
      }
    });
    imageBucket.grantReadWrite(pinHandler);
    pinTable.grantReadWriteData(pinHandler);

    const sharpLayer = new LayerVersion(this, 'SharpLayer', {
      code: Code.fromAsset('lib/layers/sharp_layer'),
      compatibleRuntimes: [Runtime.NODEJS_20_X],
      description: 'Sharp image processing library'
    });

    const thumbnailHandler = new NodejsFunction(this, 'ThumbnailHandler', {
      entry: resolve(rootPath, 'lib/api/thumbnail-lambda.ts'),
      runtime: Runtime.NODEJS_20_X,
      bundling: { externalModules: ['@aws-sdk', 'sharp'] },
      layers: [sharpLayer],
      memorySize: 1536,
      timeout: Duration.seconds(60),
      environment: {
        IMAGE_BUCKET: imageBucket.bucketName,
        PIN_TABLE: pinTable.tableName
      }
    });
    imageBucket.grantReadWrite(thumbnailHandler);
    imageBucket.grantPutAcl(thumbnailHandler);
    pinTable.grantReadWriteData(thumbnailHandler);

    // S3 integration
    imageBucket.addEventNotification(
      EventType.OBJECT_CREATED,
      new LambdaDestination(thumbnailHandler),
      { prefix: 'original' }
    );

    const api = new RestApi(this, `CdkWorkshopAPI_${props.userName}`);
    Tags.of(api).add('public', 'true')

    const helloApi = api.root.addResource('hello');
    helloApi.addMethod('GET', new LambdaIntegration(helloHandler));

    const pinApi = api.root.addResource('pin');

    // OPTIONS /pin
    addCorsOptions(pinApi);
    // ANY /pin
    pinApi.addMethod('ANY', new LambdaIntegration(pinHandler));

    const pinPointApi = pinApi.addResource('{pointUrl}');

    // OPTIONS /pin/{pointUrl}
    addCorsOptions(pinPointApi);
    // ANY /pin/{pointUrl}
    pinPointApi.addMethod('ANY', new LambdaIntegration(pinHandler));

    // WEB

    const webBucket = new Bucket(this, 'WebBucket', {
      websiteIndexDocument: 'index.html',
      blockPublicAccess: {
        blockPublicAcls: false,
        blockPublicPolicy: false,
        ignorePublicAcls: false,
        restrictPublicBuckets: false
      },
      removalPolicy: RemovalPolicy.DESTROY
    });

    webBucket.grantPublicAccess();
    Tags.of(webBucket).add('public', 'true');

    const webSource = Source.asset(resolve(rootPath, 'dist/web'));

    const webDeployment = new BucketDeployment(this, 'WebDeployment', {
      sources: [webSource],
      destinationBucket: webBucket
    });

    const webIndex = new WebIndex(this, 'WebIndex', {
      apiBaseUrl: api.url,
      source: webSource,
      bucket: webBucket
    });

    webIndex.node.addDependency(webDeployment);

    new CfnOutput(this, 'WebBucketUrl', {
      value: webBucket.bucketWebsiteUrl
    });

    // CDN

    const noCachePolicy = new CachePolicy(this, 'NoCachePolicy', {
      minTtl: Duration.seconds(0),
      maxTtl: Duration.seconds(0),
      defaultTtl: Duration.seconds(0),
      headerBehavior: CacheHeaderBehavior.none(),
      queryStringBehavior: CacheQueryStringBehavior.none()
    });

    const webBucketOrigin = new S3StaticWebsiteOrigin(webBucket);
    const cloudFront = new Distribution(this, 'WebDistribution', {
      defaultBehavior: { origin: webBucketOrigin },
      additionalBehaviors: {
        'index.html': { origin: webBucketOrigin, cachePolicy: noCachePolicy }
      },
      priceClass: PriceClass.PRICE_CLASS_100
    });

    new CfnOutput(this, 'WebDistributionDomainName', { value: cloudFront.domainName });
  }
}
