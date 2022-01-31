import {Stack, StackProps} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ecs_patterns from 'aws-cdk-lib/aws-ecs-patterns';
import { DockerImageAsset } from "aws-cdk-lib/aws-ecr-assets";
import path = require('path');
import cdk = require('aws-cdk-lib');
import {Vpc} from "aws-cdk-lib/aws-ec2";

export class FargateServiceStack extends Stack {

    /**
     * @param scope
     * @param id
     * @param props
     */
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        const serviceName = this.node.tryGetContext('service-name');

        const vpc = this.createVpc(serviceName);

        const cluster = this.createCluster(serviceName, vpc);

        this.createLoadBalancedFargateTaskDefinition(serviceName, vpc, cluster);
    }

    /**
     * Create a VPC for the service
     */
    private createVpc(serviceName: string): ec2.Vpc {
        return new ec2.Vpc(this, `${serviceName}Vpc`, {
            vpcName: `${serviceName}Vpc`,
            cidr: '10.0.0.0/16',
            natGateways: 1,
            maxAzs: 3,
            subnetConfiguration: [
                {
                    name: 'Private',
                    subnetType: ec2.SubnetType.PRIVATE_WITH_NAT,
                    cidrMask: 24,
                },
                {
                    name: 'Public',
                    subnetType: ec2.SubnetType.PUBLIC,
                    cidrMask: 24,
                },
                {
                    name: 'Isolated',
                    subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
                    cidrMask: 28,
                }
            ]
        })
    }


    /**
     *
     * @param serviceName
     * @param vpc
     * @private
     */
    private createCluster(serviceName: string, vpc: Vpc): ecs.Cluster {
        return new ecs.Cluster(this, `${serviceName}Cluster`, {
            vpc: vpc
        });
    }

    /**
     *
     * @param serviceName
     * @param vpc
     * @param cluster
     */
    private createLoadBalancedFargateTaskDefinition(serviceName: string, vpc: ec2.Vpc, cluster: ecs.Cluster) {

        const memoryLimit = this.node.tryGetContext('memory-limit');
        const cpu = this.node.tryGetContext('cpu');
        const htpasswd = this.node.tryGetContext('htpasswd')

        const taskDefinition = new ecs.FargateTaskDefinition(this, `${serviceName}TaskDefinition`, {
            memoryLimitMiB: memoryLimit,
            cpu: cpu
        })

        const nginxImage = new DockerImageAsset(this, `${serviceName}NginxImage`, {
            directory: path.join(__dirname, 'nginx'),
            buildArgs: {
                HTPASSWD: htpasswd
            }
        });

        new ecs.ContainerDefinition(this, `${serviceName}NginxTask`, {
            image: ecs.ContainerImage.fromDockerImageAsset(nginxImage),
            taskDefinition: taskDefinition,
            logging: new ecs.AwsLogDriver({ streamPrefix: `${serviceName}NginxTask` })
        }).addPortMappings({
            containerPort: 80
        });

        const fargateService = new ecs_patterns.ApplicationLoadBalancedFargateService(this, `${serviceName}AppTask`, {
            cluster: cluster,
            taskDefinition: taskDefinition,
            desiredCount: 1,
            assignPublicIp: false,
            publicLoadBalancer: true
        });

        fargateService.targetGroup.configureHealthCheck({
            path: '/health',
            interval: cdk.Duration.seconds(5),
            unhealthyThresholdCount: 3,
            healthyThresholdCount: 5
        });

        fargateService.targetGroup.setAttribute('deregistration_delay.timeout_seconds', '10');

        const scaling = fargateService.service.autoScaleTaskCount({maxCapacity: 2})
        scaling.scaleOnCpuUtilization(`${serviceName}ScalingPolicy`, {
            targetUtilizationPercent: 50,
            scaleInCooldown: cdk.Duration.seconds(60),
            scaleOutCooldown: cdk.Duration.seconds(60)
        });
    }
}
