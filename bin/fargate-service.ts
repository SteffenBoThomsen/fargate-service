#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import {FargateServiceStack} from '../lib/fargate-service/fargate-service-stack';

const production = {
    accountId: '221353586733',
    region: 'eu-north-1'
}

const app = new cdk.App();

new FargateServiceStack(app, 'FargateServiceStack', {
    env: production,
    htpasswd: app.node.tryGetContext('htpasswd'),
    serviceName: app.node.tryGetContext('service-name') ?? 'SampleFargateApp'
});