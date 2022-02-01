import {Stack} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ecs_patterns from 'aws-cdk-lib/aws-ecs-patterns';
import {DockerImageAsset} from "aws-cdk-lib/aws-ecr-assets";
import path = require('path');
import cdk = require('aws-cdk-lib');
import {Vpc} from "aws-cdk-lib/aws-ec2";
import {FargateServiceProps} from './interfaces/fargate-service-props';


export class FargateServiceStack extends Stack {

    /**
     * @param scope
     * @param id
     * @param props
     */
    constructor(scope: Construct, id: string, props: FargateServiceProps) {
        super(scope, id, props);

        const vpc = this.createVpc(props);

        const cluster = this.createCluster(props, vpc);

        this.createLoadBalancedFargateTaskDefinition(props, vpc, cluster);
    }

    /**
     * Create a VPC for the service
     */
    private createVpc(props: FargateServiceProps): ec2.Vpc {
        return new ec2.Vpc(this, `${props.serviceName}Vpc`, {
            vpcName: `${props.serviceName}Vpc`,
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
        });
    }


    /**
     * @param props
     * @param vpc
     * @private
     */
    private createCluster(props: FargateServiceProps, vpc: Vpc): ecs.Cluster {
        return new ecs.Cluster(this, `${props.serviceName}Cluster`, {
            vpc: vpc
        });
    }

    /**
     * @param props
     * @param vpc
     * @param cluster
     */
    private createLoadBalancedFargateTaskDefinition(props: FargateServiceProps, vpc: ec2.Vpc, cluster: ecs.Cluster) {

        const taskDefinition = new ecs.FargateTaskDefinition(this, `${props.serviceName}TaskDefinition`, {
            memoryLimitMiB: props.memoryLimit === undefined ? 512 : props.memoryLimit,
            cpu: props.cpu === undefined ? 256 : props.cpu
        });

        const nginxImage = new DockerImageAsset(this, `${props.serviceName}NginxImage`, {
            directory: path.join(__dirname, '..', 'nginx'),
            buildArgs: {
                HTPASSWD: props.htpasswd
            }
        });

        new ecs.ContainerDefinition(this, `${props.serviceName}NginxTask`, {
            image: ecs.ContainerImage.fromDockerImageAsset(nginxImage),
            taskDefinition: taskDefinition,
            logging: new ecs.AwsLogDriver({streamPrefix: `${props.serviceName}NginxTask`})
        }).addPortMappings({
            containerPort: 80
        });

        const fargateService = new ecs_patterns.ApplicationLoadBalancedFargateService(this, `${props.serviceName}AppTask`, {
            cluster: cluster,
            taskDefinition: taskDefinition,
            desiredCount: 1,
            assignPublicIp: false,
            publicLoadBalancer: true
        });

        fargateService.targetGroup.configureHealthCheck({
            path: '/health'
        });

        fargateService.targetGroup.setAttribute('deregistration_delay.timeout_seconds', '60');

        const scaling = fargateService.service.autoScaleTaskCount({maxCapacity: 2})
        scaling.scaleOnCpuUtilization(`${props.serviceName}ScalingPolicy`, {
            targetUtilizationPercent: 50,
            scaleInCooldown: cdk.Duration.seconds(60),
            scaleOutCooldown: cdk.Duration.seconds(60)
        });
    }
}
