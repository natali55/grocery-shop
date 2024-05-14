import { aws_logs } from 'aws-cdk-lib';
import { SnsDestination } from 'aws-cdk-lib/aws-s3-notifications';
import { PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { SqsEventSource, SqsEventSourceProps } from 'aws-cdk-lib/aws-lambda-event-sources';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as cdk from 'aws-cdk-lib/core';
import * as snsSubscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import { Duration, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib/core';
import {
    AccessLogFormat, CfnAccount, IdentitySource,
    LambdaIntegration,
    LogGroupLogDestination,
    MockIntegration, ResponseType,
    RestApi,
    TokenAuthorizer
} from 'aws-cdk-lib/aws-apigateway';
import { LambdaDestination } from 'aws-cdk-lib/aws-s3-notifications';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import * as path from 'path';
import { githubAccountLoginVariable, passwordVariable, productsTableName, stockTableName } from '../../env/env';
import { basicAuthorizer } from '../authorization-service/lambda/basic-authorizer';
import { lambdaPath } from '../shared/lambdas.config';

export class ImportServiceStackUnique extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        const bucket = new s3.Bucket(this, 'UploadedFilesBucket2', {
            removalPolicy: RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
            bucketName: 'uploaded-files-bucket-2',
            cors: [
                {
                    allowedOrigins: [
                        'https://d2ju856t2gddwd.cloudfront.net'
                    ],
                    allowedMethods: [
                        s3.HttpMethods.GET,
                        s3.HttpMethods.PUT,
                        s3.HttpMethods.POST,
                        s3.HttpMethods.DELETE
                    ],
                    allowedHeaders: ['*']
                },
            ],
        });


        const importProductsFileLambda = new NodejsFunction(this, 'importProductsFile2', {
            entry: path.resolve(__dirname, `${lambdaPath}/import-products-file.ts`),
            functionName: 'importProductsFile',
            handler: 'importProductsFile',
            memorySize: 1024,
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

        new lambda.CfnPermission(this, 'AllowS3BucketNotification2', {
            action: 'lambda:InvokeFunction',
            functionName: importProductsFileLambda.functionName,
            principal: 's3.amazonaws.com',
            sourceArn: bucket.bucketArn
        });


        const basicAuthorizerLambda = new NodejsFunction(this, 'basicAuthorizerLambda2', {
            entry: path.resolve(__dirname, `../authorization-service/lambda/basic-authorizer.ts`),
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

        const tokenAuthorizer: TokenAuthorizer | undefined = basicAuthorizerLambda ? new TokenAuthorizer(this, 'MyAuthorizer2', {
            handler: basicAuthorizerLambda
        }) : undefined;

        const logGroup = this.createApiGatewayAccessLogsGroup(this);

        const importApi = new RestApi(this, 'import-api-2', {
            restApiName: "Import Product API Gateway",
            deployOptions: {
                accessLogDestination: new LogGroupLogDestination(
                    logGroup
                ),
                accessLogFormat: AccessLogFormat.jsonWithStandardFields(),
            },
            cloudWatchRole: true
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
                    'method.response.header.Access-Control-Allow-Headers': "'Content-Type,Authorization'",
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

        importResource.addCorsPreflight({
            allowOrigins: ['https://d2ju856t2gddwd.cloudfront.net'],
            allowMethods: ['GET', 'OPTIONS']
        });

        importResource.addMethod('GET', lambdaIntegration, {
            methodResponses: [
                {
                    statusCode: '200',
                    responseParameters: {
                        'method.response.header.Access-Control-Allow-Headers': true,
                        'method.response.header.Access-Control-Allow-Origin': true,
                        'method.response.header.Access-Control-Allow-Methods': true,
                    }
                },
            ],
            authorizer: tokenAuthorizer
        });


        importApi.addGatewayResponse('authorization-denied', {
            type: ResponseType.ACCESS_DENIED,
            statusCode: '403',
            responseHeaders: {
                'Access-Control-Allow-Origin': "'https://d2ju856t2gddwd.cloudfront.net'"
            }
        })

        importApi.addGatewayResponse('authorization-unauthorized', {
            type: ResponseType.UNAUTHORIZED,
            statusCode: '401',
            responseHeaders: {
                'Access-Control-Allow-Origin': "'https://d2ju856t2gddwd.cloudfront.net'"
            }
        })

        // importResource.addMethod('OPTIONS', new MockIntegration({
        //     integrationResponses: [{
        //         statusCode: '200',
        //         responseParameters: {
        //             'method.response.header.Access-Control-Allow-Headers': "'Content-Type,Authorization'",
        //             'method.response.header.Access-Control-Allow-Origin': "'https://d2ju856t2gddwd.cloudfront.net'",
        //             'method.response.header.Access-Control-Allow-Methods': "'GET,PUT,OPTIONS'"
        //         }
        //     }],
        //     requestTemplates: {
        //         'application/json': "{statusCode: 200}"
        //     }
        // }), {
        //     methodResponses: [{
        //         statusCode: '200',
        //         responseParameters: {
        //             'method.response.header.Access-Control-Allow-Headers': true,
        //             'method.response.header.Access-Control-Allow-Origin': true,
        //             'method.response.header.Access-Control-Allow-Methods': true,
        //         }
        //     }]
        // });

        // A dead-letter queue (it helps capture any failed messages).
        const deadLetterQueue = new sqs.Queue(this, 'catalogItemsDeadLetterQueue2', {
            queueName: 'catalogItemsDeadLetterQueue',
            retentionPeriod: Duration.days(7)
        });

        // Create a SQS Queue.
        const catalogItemsQueue = new sqs.Queue(this, 'catalogItemsQueue2', {
            queueName: 'catalogItemsQueue',
            visibilityTimeout: Duration.seconds(10),
            deadLetterQueue: {
                maxReceiveCount: 1,
                queue: deadLetterQueue
            }
        });


        const importFileParserLambda = new NodejsFunction(this, 'importFileParser2', {
            entry: path.resolve(__dirname, `${lambdaPath}/import-file-parser.ts`),
            functionName: 'importFileParser',
            handler: 'importFileParser',
            memorySize: 1024,
            runtime: lambda.Runtime.NODEJS_18_X,
            timeout: Duration.seconds(5),
            bundling: {
                target: 'esnext'
            },
            environment: {
                BUCKET_NAME: bucket.bucketName,
                QUEUE_URL: catalogItemsQueue.queueUrl
            }
        });

        bucket.grantReadWrite(importFileParserLambda);

        bucket.addObjectCreatedNotification(
            new LambdaDestination(importFileParserLambda),
            { prefix: 'uploaded/' }
        );

        catalogItemsQueue.grantSendMessages(importFileParserLambda);

        // Create a SNS Topic.
        const uploadEventTopic = new sns.Topic(this, 'CsvUploadEventTopic2', {
            topicName: 'CsvUploadEventTopic2'
        });


        // Bind the SQS Queue to the SNS Topic.
        new snsSubscriptions.SqsSubscription(catalogItemsQueue, {
            rawMessageDelivery: true
        });

        uploadEventTopic.addSubscription(new snsSubscriptions.EmailSubscription('natasha.epam@gmail.com'));


        const catalogBatchProcessLambdaFunction = new NodejsFunction(this, 'catalogBatchProcess2', {
            entry: path.resolve(__dirname, `${lambdaPath}/catalog-batch-process.ts`),
            functionName: 'catalogBatchProcess',
            handler: 'catalogBatchProcess',
            memorySize: 1024,
            runtime: Runtime.NODEJS_18_X,
            timeout: cdk.Duration.seconds(5),
            bundling: {
                target: 'esnext'
            },
            environment: {
                PRODUCT_TABLE_NAME: productsTableName,
                STOCK_TABLE_NAME: stockTableName,
                QUEUE_URL: catalogItemsQueue.queueUrl,
                UPLOAD_TOPIC_ARN: uploadEventTopic.topicArn
            },
        });

        catalogBatchProcessLambdaFunction.addToRolePolicy(
            new PolicyStatement({
                actions: ['dynamodb:BatchWriteItem'],
                resources: [`arn:aws:dynamodb:${this.region}:${this.account}:table/${productsTableName}`],
            }),
        );

        catalogBatchProcessLambdaFunction.addToRolePolicy(
            new PolicyStatement({
                actions: ['dynamodb:BatchWriteItem'],
                resources: [`arn:aws:dynamodb:${this.region}:${this.account}:table/${stockTableName}`],
            }),
        );


        uploadEventTopic.grantPublish(catalogBatchProcessLambdaFunction);

        const sqsEventSourceProps: SqsEventSourceProps = {
            batchSize: 5
        }

        catalogBatchProcessLambdaFunction.addEventSource(new SqsEventSource(catalogItemsQueue, sqsEventSourceProps));
    }

    private createApiGatewayAccessLogsGroup(
        scope: Construct
    ) {
        const logGroupName = "apigateway-auth-lambda-2";
        const logRetention = new aws_logs.LogRetention(
            scope,
            "apiGwLogGroupConstruct2",
            {
                logGroupName: logGroupName,
                retention: aws_logs.RetentionDays.ONE_WEEK,
                removalPolicy: cdk.RemovalPolicy.DESTROY,
            }
        );
        const logGroup = aws_logs.LogGroup.fromLogGroupArn(
            scope,
            "apiGwLogGroup2",
            logRetention.logGroupArn
        );
        return logGroup;
    }
}
