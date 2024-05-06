import { Duration, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib/core';
import { LambdaIntegration, MockIntegration, PassthroughBehavior, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { LambdaDestination } from 'aws-cdk-lib/aws-s3-notifications';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import * as path from 'path';

export class ImportServiceStackUnique extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        const bucket = new s3.Bucket(this, 'UploadedFilesBucket1', {
            removalPolicy: RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
            bucketName: 'uploaded-files-bucket-1',
            cors: [
                {
                    allowedOrigins: [
                        'http://localhost:4200',
                        'https://d2ju856t2gddwd.cloudfront.net',
                    ],
                    allowedMethods: [
                        s3.HttpMethods.GET,
                        s3.HttpMethods.PUT,
                        s3.HttpMethods.POST,
                        s3.HttpMethods.DELETE,
                    ],
                    allowedHeaders: ['*'],
                },
            ],
        });


        const importProductsFileLambda = new NodejsFunction(this, 'importProductsFile', {
            entry: path.resolve(__dirname, '../src/product-service/import-products-file.ts'),
            functionName: 'importProductsFile',
            handler: 'importProductsFile',
            memorySize: 512,
            runtime: lambda.Runtime.NODEJS_18_X,
            timeout: Duration.seconds(5),
            bundling: {
                target: 'esnext'
            },
            environment: {
                BUCKET_NAME: bucket.bucketName
            }
        });

        bucket.grantReadWrite(importProductsFileLambda);

        new lambda.CfnPermission(this, 'AllowS3BucketNotification', {
            action: 'lambda:InvokeFunction',
            functionName: importProductsFileLambda.functionName,
            principal: 's3.amazonaws.com',
            sourceArn: bucket.bucketArn,
        });

        const importApi = new RestApi(this, 'import-api', {
            restApiName: "Import Product API Gateway"
        });

        const lambdaIntegration = new LambdaIntegration(importProductsFileLambda, {
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

        const importResource = importApi.root.addResource('import');

        importResource.addMethod('GET', lambdaIntegration, {
            methodResponses: [
                {
                    statusCode: '200',
                    responseParameters: {
                        'method.response.header.Access-Control-Allow-Headers': true,
                        'method.response.header.Access-Control-Allow-Origin': true,
                        'method.response.header.Access-Control-Allow-Methods': true,
                    },
                },
            ]
        });

        importResource.addMethod('OPTIONS', new MockIntegration({
            integrationResponses: [{
                statusCode: '200',
                responseParameters: {
                    'method.response.header.Access-Control-Allow-Headers': "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'",
                    'method.response.header.Access-Control-Allow-Origin': "'https://d2ju856t2gddwd.cloudfront.net'",
                    'method.response.header.Access-Control-Allow-Methods': "'GET,PUT,OPTIONS'"
                }
            }],
            requestTemplates: {
                'application/json': "{statusCode: 200}"
            }
        }), {
            methodResponses: [{
                statusCode: '200',
                responseParameters: {
                    'method.response.header.Access-Control-Allow-Headers': true,
                    'method.response.header.Access-Control-Allow-Origin': true,
                    'method.response.header.Access-Control-Allow-Methods': true,
                }
            }]
        });


        const importFileParserLambda = new NodejsFunction(this, 'importFileParser', {
            entry: path.resolve(__dirname, '../src/product-service/import-file-parser.ts'),
            functionName: 'importFileParser',
            handler: 'importFileParser',
            memorySize: 512,
            runtime: lambda.Runtime.NODEJS_18_X,
            timeout: Duration.seconds(5),
            bundling: {
                target: 'esnext'
            },
            environment: {
                BUCKET_NAME: bucket.bucketName,
            }
        });

        bucket.grantReadWrite(importFileParserLambda);

        bucket.addObjectCreatedNotification(
            new LambdaDestination(importFileParserLambda),
            { prefix: 'uploaded/' }
        );
    }
}
