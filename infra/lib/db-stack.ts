import { Stack, StackProps } from "aws-cdk-lib";
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";

export class DbStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps, lambda?: NodejsFunction) {
    super(scope, id, props);

    const productsTable = new dynamodb.Table(this, "Products", {
      tableName: 'Products',
      partitionKey: {
        name: "id",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "price",
        type: dynamodb.AttributeType.NUMBER,
      },
    });

    const stockTable = new dynamodb.Table(this, "Stock", {
      tableName: 'Stock',
      partitionKey: {
        name: "product_id",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "count",
        type: dynamodb.AttributeType.NUMBER,
      },
    });

    if (lambda) {
      productsTable.grantWriteData(lambda);
      productsTable.grantReadData(lambda);
      stockTable.grantWriteData(lambda);
      stockTable.grantReadData(lambda);
    }
  }
}
