#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { APP, HelloWorldStack } from '../lib/hello-world-stack';

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION ?? process.env.AWS_REGION ?? 'us-east-1',
};

cdk.Tags.of(app).add('Application', APP);
cdk.Tags.of(app).add('Project', APP);
cdk.Tags.of(app).add('ManagedBy', 'cdk');
cdk.Tags.of(app).add('Environment', 'personal');

const owner = app.node.tryGetContext('owner') as string | undefined;
if (owner) {
  cdk.Tags.of(app).add('Owner', owner);
}

new HelloWorldStack(app, 'HelloWorldStack', {
  env,
  description:
    'Hello World static site. Portal opens and seals it. No NAT, no ALB, no EC2.',
});
