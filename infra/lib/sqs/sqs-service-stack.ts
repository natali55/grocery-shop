import { Construct } from 'constructs';
import * as path from "path";
import * as cdk from 'aws-cdk-lib/core';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction, SourceMapMode } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as sqs from "aws-cdk-lib/aws-sqs";
import { SqsEventSource, SqsEventSourceProps } from "aws-cdk-lib/aws-lambda-event-sources";
import { PolicyStatement } from "aws-cdk-lib/aws-iam";

export class SqsServiceStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const productTableName = 'ProductsDB';
        const stockTableName = 'StockDB';

        const catalogItemsQueue = new sqs.Queue(this, "catalog-items-queue");

        const catalogBatchProcessLambdaFunction = new NodejsFunction(this, 'catalogBatchProcess', {
            entry: path.resolve(__dirname, '../../src/product-service/catalog-batch-process.ts'),
            functionName: 'catalogBatchProcess',
            handler: 'catalogBatchProcess',
            memorySize: 512,
            runtime: Runtime.NODEJS_18_X,
            timeout: cdk.Duration.seconds(5),
            bundling: {
                target: 'esnext'
            },
            environment: {
                PRODUCT_TABLE_NAME: productTableName,
                STOCK_TABLE_NAME: stockTableName,
            },
        });

        catalogBatchProcessLambdaFunction.addToRolePolicy(
            new PolicyStatement({
                actions: ['dynamodb:BatchWriteItem'],
                resources: [`arn:aws:dynamodb:${this.region}:${this.account}:table/${productTableName}`],
            }),
        );

        catalogBatchProcessLambdaFunction.addToRolePolicy(
            new PolicyStatement({
                actions: ['dynamodb:BatchWriteItem'],
                resources: [`arn:aws:dynamodb:${this.region}:${this.account}:table/${stockTableName}`],
            }),
        );

        const sqsEventSourceProps: SqsEventSourceProps = {
            batchSize: 5
        }

        catalogBatchProcessLambdaFunction.addEventSource(new SqsEventSource(catalogItemsQueue, sqsEventSourceProps));
    }
}
