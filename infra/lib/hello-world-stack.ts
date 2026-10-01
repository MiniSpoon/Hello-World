import * as fs from 'node:fs';
import * as path from 'node:path';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as ssm from 'aws-cdk-lib/aws-ssm';

/** Cost allocation / FinOps identifier. Activate this key in Billing Console. */
export const APP = 'HelloWorld';

export class HelloWorldStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const bucket = new s3.Bucket(this, 'SiteBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });
    cdk.Tags.of(bucket).add('Name', 'hello-world-site');
    cdk.Tags.of(bucket).add('Component', 'site');

    // The open/sealed switch lives in a key-value store, not in the
    // distribution's Enabled flag. A later deploy of this stack would turn
    // Enabled back on, and disabling a distribution takes minutes.
    const store = new cloudfront.KeyValueStore(this, 'GateStore', {
      keyValueStoreName: 'hello-world-gate',
      comment: 'Portal open/sealed switch for Hello World',
    });
    cdk.Tags.of(store).add('Name', 'hello-world-gate');
    cdk.Tags.of(store).add('Component', 'gate');

    const gateSource = fs
      .readFileSync(path.join(__dirname, 'gate.js'), 'utf8')
      .replaceAll('__KVS_ID__', store.keyValueStoreId);

    const gateFn = new cloudfront.Function(this, 'GateFn', {
      functionName: 'hello-world-gate',
      comment: 'Returns the sealed page when Portal sets gate=sealed',
      code: cloudfront.FunctionCode.fromInline(gateSource),
      runtime: cloudfront.FunctionRuntime.JS_2_0,
      keyValueStore: store,
      autoPublish: true,
    });
    cdk.Tags.of(gateFn).add('Name', 'hello-world-gate');
    cdk.Tags.of(gateFn).add('Component', 'gate');

    const distribution = new cloudfront.Distribution(this, 'Site', {
      comment: 'hello-world',
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      defaultRootObject: 'index.html',
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(bucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        compress: true,
        functionAssociations: [
          {
            function: gateFn,
            eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
          },
        ],
      },
    });
    cdk.Tags.of(distribution).add('Name', 'hello-world-cdn');
    cdk.Tags.of(distribution).add('Component', 'site-cdn');

    const indexHtml = fs.readFileSync(path.join(__dirname, '../../index.html'), 'utf8');
    new s3deploy.BucketDeployment(this, 'DeploySite', {
      sources: [s3deploy.Source.data('index.html', indexHtml)],
      destinationBucket: bucket,
      distribution,
      distributionPaths: ['/index.html'],
      contentType: 'text/html; charset=utf-8',
      cacheControl: [
        s3deploy.CacheControl.setPublic(),
        s3deploy.CacheControl.maxAge(cdk.Duration.minutes(5)),
      ],
      prune: true,
    });

    const siteUrl = `https://${distribution.distributionDomainName}`;

    new ssm.StringParameter(this, 'KvsArnParam', {
      parameterName: '/hello-world/kvs-arn',
      stringValue: store.keyValueStoreArn,
      description: 'Key-value store Portal writes to open or seal Hello World',
      tier: ssm.ParameterTier.STANDARD,
    });
    new ssm.StringParameter(this, 'UrlParam', {
      parameterName: '/hello-world/url',
      stringValue: siteUrl,
      description: 'Public URL of the Hello World site',
      tier: ssm.ParameterTier.STANDARD,
    });
    new cdk.CfnOutput(this, 'SiteUrl', {
      description: 'Hello World. Open while the gate is unsealed.',
      value: siteUrl,
    });
    new cdk.CfnOutput(this, 'DistributionId', {
      value: distribution.distributionId,
    });
    new cdk.CfnOutput(this, 'GateStoreArn', {
      value: store.keyValueStoreArn,
    });
    new cdk.CfnOutput(this, 'CostAllocationTag', {
      description: 'Activate this tag key in Billing → Cost allocation tags',
      value: 'Application=HelloWorld',
    });
  }
}
