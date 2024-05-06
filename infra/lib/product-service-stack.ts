import { StackProps, Stack, Duration } from 'aws-cdk-lib';
import { LambdaIntegration, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { NodejsFunction, SourceMapMode } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
import * as path from 'path';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { productsTableName, stockTableName } from '../environments/env';

export class ProductServiceStack extends Stack {
  public lambdaFunctions: NodejsFunction[] = [];

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const lambdaProductsList = new NodejsFunction(this, 'lambda-products-list', {
      functionName: 'getProductsList',
      entry: path.resolve(__dirname, '../src/product-service/get-products-list.ts'),
      runtime: lambda.Runtime.NODEJS_18_X,
      memorySize: 1024,
      timeout: Duration.seconds(5),
      handler: 'getProductsList',
      bundling: {
        target: 'esnext'
      },
      environment: {
        PRODUCTS_TABLE_NAME: productsTableName,
        STOCK_TABLE_NAME: stockTableName
      }
    });

    this.lambdaFunctions.push(lambdaProductsList);

    const lambdaProductsById = new NodejsFunction(this, 'lambda-products-by-id', {
      functionName: 'getProductsById',
      entry: path.resolve(__dirname, '../src/product-service/get-products-by-id.ts'),
      runtime: lambda.Runtime.NODEJS_18_X,
      memorySize: 1024,
      timeout: Duration.seconds(5),
      handler: 'getProductsById',
      bundling: {
        target: 'esnext'
      },
      environment: {
        PRODUCTS_TABLE_NAME: productsTableName,
        STOCK_TABLE_NAME: stockTableName
      }
    });

    this.lambdaFunctions.push(lambdaProductsById);

    const lambdaCreateProduct = new NodejsFunction(this, 'lambda-create-product', {
      functionName: 'createProduct',
      entry: path.resolve(__dirname, '../src/product-service/create-product.ts'),
      runtime: lambda.Runtime.NODEJS_18_X,
      memorySize: 1024,
      timeout: Duration.seconds(5),
      handler: 'createProduct',
      bundling: {
        target: 'esnext'
      },
      environment: {
        PRODUCTS_TABLE_NAME: productsTableName,
        STOCK_TABLE_NAME: stockTableName
      }
    });

    this.lambdaFunctions.push(lambdaCreateProduct);


    const productsApi = new RestApi(this, "products-api", {
      restApiName: "Products API Gateway",
      description: "This Products-API serves the Lambda functions."
    });

    const productsFromLambdaIntegration = new LambdaIntegration(lambdaProductsList, {
      integrationResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Headers': "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent'",
            'method.response.header.Access-Control-Allow-Origin': "'https://d2ju856t2gddwd.cloudfront.net'",
            'method.response.header.Access-Control-Allow-Credentials': "'true'",
            'method.response.header.Access-Control-Allow-Methods': "'OPTIONS,GET,PUT,POST,DELETE'",
          },
          responseTemplates: {
            'application/json': "$util.parseJson($input.json('$.body'))" // Parse the body of the response
          }
        }
      ],
      proxy: false
    });

    // Create a resource /products and GET request under it
    const productsResource = productsApi.root.addResource("products");
    // On this resource attach a GET method which pass request to our Lambda function
    productsResource.addMethod('GET', productsFromLambdaIntegration, {
      methodResponses: [{
        statusCode: '200',
        responseParameters: {
          'method.response.header.Access-Control-Allow-Headers': true,
          'method.response.header.Access-Control-Allow-Origin': true,
          'method.response.header.Access-Control-Allow-Credentials': true,
          'method.response.header.Access-Control-Allow-Methods': true,
        }
      }],
    });

    productsResource.addCorsPreflight({
      allowOrigins: ['https://d2ju856t2gddwd.cloudfront.net'],
      allowMethods: ['GET', 'OPTIONS'],
      allowHeaders: ['Content-Type']
    });

    const productsByIdFromLambdaIntegration = new LambdaIntegration(lambdaProductsById, {
      integrationResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Headers': "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent'",
            'method.response.header.Access-Control-Allow-Origin': "'https://d2ju856t2gddwd.cloudfront.net'",
            'method.response.header.Access-Control-Allow-Credentials': "'true'",
            'method.response.header.Access-Control-Allow-Methods': "'OPTIONS,GET,PUT,POST,DELETE'",
          },
          responseTemplates: {
            'application/json': "$util.parseJson($input.json('$.body'))" // Parse the body of the response
          }
        }
      ],
      requestTemplates: {
        'application/json': JSON.stringify({
          pathParameters: {
            product_id: "$input.params('product_id')"
          }
        })
      },
      proxy: false
    });

    const productByIdResource = productsResource.addResource('{product_id}')
    productByIdResource.addMethod('GET', productsByIdFromLambdaIntegration, {
      methodResponses: [{
        statusCode: '200',
        responseParameters: {
          'method.response.header.Access-Control-Allow-Headers': true,
          'method.response.header.Access-Control-Allow-Origin': true,
          'method.response.header.Access-Control-Allow-Credentials': true,
          'method.response.header.Access-Control-Allow-Methods': true
        }
      }]
    })

    productByIdResource.addCorsPreflight({
      allowOrigins: ['https://d2ju856t2gddwd.cloudfront.net'],
      allowMethods: ['GET', 'OPTIONS'],
      allowHeaders: ['Content-Type']
    });

    const createProductFromLambdaIntegration = new LambdaIntegration(lambdaCreateProduct, {
      integrationResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Headers': "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent'",
            'method.response.header.Access-Control-Allow-Origin': "'https://d2ju856t2gddwd.cloudfront.net'",
            'method.response.header.Access-Control-Allow-Credentials': "'true'",
            'method.response.header.Access-Control-Allow-Methods': "'OPTIONS,GET,PUT,POST,DELETE'",
          },
          responseTemplates: {
            'application/json': "$util.parseJson($input.json('$.body'))" // Parse the body of the response
          }
        }
      ],
      proxy: false
    });

    // attach a POST method which pass request to our Lambda function
    productsResource.addMethod('POST', createProductFromLambdaIntegration, {
      methodResponses: [{
        statusCode: '200',
        responseParameters: {
          'method.response.header.Access-Control-Allow-Headers': true,
          'method.response.header.Access-Control-Allow-Origin': true,
          'method.response.header.Access-Control-Allow-Credentials': true,
          'method.response.header.Access-Control-Allow-Methods': true,
        }
      }],
    });

  }
}
