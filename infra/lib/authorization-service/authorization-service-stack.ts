import { Stack, StackProps } from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Duration } from 'aws-cdk-lib/core';
import * as path from 'path';
import { Construct } from 'constructs';
import { githubAccountLoginVariable, passwordVariable } from '../../env/env';
import { lambdaPath } from '../shared/lambdas.config';

export class AuthorizationServiceStack extends Stack {
  public readonly basicAuthorizerLambda;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.basicAuthorizerLambda = new NodejsFunction(this, 'basicAuthorizerLambdaNew', {
      entry: path.resolve(__dirname, `${lambdaPath}/basic-authorizer.ts`),
      functionName: 'basicAuthorizer',
      handler: 'basicAuthorizer',
      memorySize: 1024,
      runtime: lambda.Runtime.NODEJS_18_X,
      timeout: Duration.seconds(10),
      bundling: {
        target: 'esnext'
      },
      environment: {
        [`${githubAccountLoginVariable}`]: passwordVariable,
      },
    });
  }
}
