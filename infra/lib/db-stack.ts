import { Stack, StackProps } from "aws-cdk-lib";
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";

export class DbStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps, lambdaFunctions?: NodejsFunction[]) {
    super(scope, id, props);

    const productsTable = new dynamodb.Table(this, "Products", {
      tableName: 'Products',
      partitionKey: {
        name: "id",
        type: dynamodb.AttributeType.STRING,
      }
    });

    const stockTable = new dynamodb.Table(this, "Stock", {
      tableName: 'Stock',
      partitionKey: {
        name: "product_id",
        type: dynamodb.AttributeType.STRING,
      }
    });

    if (lambdaFunctions) {
      lambdaFunctions?.forEach((lambda) => {
        productsTable.grantWriteData(lambda);
        productsTable.grantReadData(lambda);
        stockTable.grantWriteData(lambda);
        stockTable.grantReadData(lambda);
      })
    }
  }
}
