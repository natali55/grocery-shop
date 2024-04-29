import * as cdk from 'aws-cdk-lib/core';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as path from 'path';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import * as apigateway from "aws-cdk-lib/aws-apigateway";

export class ImportServiceStack extends cdk.Stack {
    constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const bucket = new s3.Bucket(this, 'ImportProductsBucket', {
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
            bucketName: 'import-products-bucket',
            cors: [
                {
                    allowedOrigins: [
                        'http://localhost:3000'
                    ],
                    allowedMethods: [
                        s3.HttpMethods.GET
                    ],
                    allowedHeaders: ['*'],
                },
            ],
        });


        const importProductsFromFileLambdaFunction = new NodejsFunction(this, 'importProductsFile', {
            entry: path.resolve(__dirname, './handler.ts'),
            functionName: 'importProductsFile',
            handler: 'importProductsFile',
            memorySize: 512,
            runtime: Runtime.NODEJS_20_X,
            timeout: cdk.Duration.seconds(5),
            bundling: {
                minify: false,
                sourceMap: true,
                target: 'esnext'
            }
        });

        bucket.grantReadWrite(importProductsFromFileLambdaFunction);

        const api = new apigateway.RestApi(this, 'import-api', {
            restApiName: "Import Products API Gateway"
        });

        const getIntegration = new apigateway.LambdaIntegration(importProductsFromFileLambdaFunction, {
            requestTemplates: { 'application/json': '{ "statusCode": "200" }' },
        });

        api.root.addMethod('GET', getIntegration);
    }
}
