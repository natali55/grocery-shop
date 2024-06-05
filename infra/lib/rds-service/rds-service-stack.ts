import { StackProps, Stack, Duration, aws_ec2, aws_secretsmanager } from 'aws-cdk-lib';
import { LambdaIntegration, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { NodejsFunction, SourceMapMode } from 'aws-cdk-lib/aws-lambda-nodejs';
import { RemovalPolicy } from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import * as path from 'path';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { lambdaPath } from '../shared/lambdas.config';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

export class RdsServiceStack extends Stack {

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const dbCredentialsSecret = new aws_secretsmanager.Secret(this, 'InfraDBCredentials', {
      secretName: 'DBCredentials',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          username: 'nataliadmin'
        }),
        excludePunctuation: true,
        includeSpace: false,
        generateStringKey: 'password'
      }
    });


    // Define the VPC
    const vpc = new ec2.Vpc(this, 'InfraVPC', {
      maxAzs: 2, // Default is all AZs in the region
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'PublicSubnet',
          subnetType: ec2.SubnetType.PUBLIC,
        }
      ]
    });

    // Define the Security Group for RDS
    const rdsSecurityGroup = new ec2.SecurityGroup(this, 'InfraRdsSecurityGroup', {
      vpc,
      description: 'Allow access to RDS instance',
    });


    // Define the RDS Database Instance
    const rdsInstance = new rds.DatabaseInstance(this, 'InfraRdsInstance', {
      engine: rds.DatabaseInstanceEngine.mysql({
        version: rds.MysqlEngineVersion.VER_8_0
      }),

      instanceType: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE3, ec2.InstanceSize.MICRO),
      vpc,
      credentials: rds.Credentials.fromSecret(dbCredentialsSecret),
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC
      },
      multiAz: false,
      allocatedStorage: 20,
      maxAllocatedStorage: 100,
      allowMajorVersionUpgrade: false,
      autoMinorVersionUpgrade: true,
      backupRetention: Duration.days(7),
      deleteAutomatedBackups: true,
      removalPolicy: RemovalPolicy.DESTROY,
      deletionProtection: false
    });


    const lambdaRds = new NodejsFunction(this, 'InfraRdsLambdaFunction', {
      // lambda Function Config
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../nodejs-aws-cart-api-main/dist/main.js'),
      handler: 'handler',
      bundling: {
        externalModules: ['aws-sdk', '@nestjs/microservices', 'class-transformer', '@nestjs/websockets/socket-module', 'cache-manager', 'class-validator'], // Exclude non-runtime dependencies
      },
      vpc, // Associate the Lambda function with the VPC
      allowPublicSubnet: true, // Confirm that lambda is in VP
      securityGroups: [rdsInstance.connections.securityGroups[0]]
    });

    rdsInstance.connections.allowDefaultPortFrom(lambdaRds)
    dbCredentialsSecret.grantRead(lambdaRds);

    // Create API for the Nest.js application
    const nestApi = new RestApi(this, 'rds-api', {
      restApiName: "RDS API Gateway"
    });

    const apiFromLambdaIntegration = new LambdaIntegration(lambdaRds, {
      requestTemplates: {
        'application/json': JSON.stringify({
          queryStringParameters: {
            name: "$input.params('name')"
          }
        })
      },
      integrationResponses: [{
        statusCode: '200',
        responseParameters: {
          'method.response.header.Access-Control-Allow-Headers': "'Content-Type'",
          'method.response.header.Access-Control-Allow-Origin': "'https://d2ju856t2gddwd.cloudfront.net'",
          'method.response.header.Access-Control-Allow-Methods': "'GET,PUT,OPTIONS'"
        },
        responseTemplates: {
          'application/json': "$util.parseJson($input.json('$.body'))"
        }
      }],
      proxy: false
    });

    nestApi.root.addMethod('GET', apiFromLambdaIntegration, {
      methodResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Headers': true,
            'method.response.header.Access-Control-Allow-Origin': true,
            'method.response.header.Access-Control-Allow-Methods': true,
          },
        },
      ],
    });

  }
}
