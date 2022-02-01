import {StackProps} from "aws-cdk-lib";

export interface FargateServiceProps extends StackProps {
    serviceName: string;

    htpasswd: string;

    memoryLimit?: number | undefined;

    cpu?: number | undefined;
}