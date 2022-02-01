import * as cdk from 'aws-cdk-lib';
import {Template} from 'aws-cdk-lib/assertions';
import * as FargateService from '../lib/fargate-service/fargate-service-stack';

test('VPC Created', () => {
    const app = new cdk.App();

    const stack = new FargateService.FargateServiceStack(app, 'TestFargateService', {
        htpasswd: 'test',
        serviceName: app.node.tryGetContext('service-name') ?? 'SampleFargateApp'
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::EC2::VPC', {
        CidrBlock: "10.0.0.0/16"
    });
});
