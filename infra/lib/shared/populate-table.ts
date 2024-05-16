import { DynamoDBClient, PutItemCommand, ScanCommand } from '@aws-sdk/client-dynamodb';
import { Handler } from 'aws-lambda';
import { v4 } from 'uuid';
import { Context } from 'vm';
import { awsRegion, productsTableName, stockTableName } from '../../env/env';
import { products } from './products-db';

const dynamoDB: DynamoDBClient = new DynamoDBClient({ region: awsRegion });

const run = async () => {
    for (const item of products) {
        const productId: string = v4();
        const productsPutCommand = new PutItemCommand({
            TableName: productsTableName,
            Item: {
                id: { S: productId},
                title: { S: item.title },
                price: { N: item.price.toString() },
                description: { S: item.description}
            }
        });

        const stockPutCommand = new PutItemCommand({
            TableName: stockTableName,
            Item: {
                product_id: { S: productId},
                count: { N: '1'}
            }
        });

        try {
            const product = await dynamoDB.send(productsPutCommand);
            const stock = await dynamoDB.send(stockPutCommand);
            console.log("Success, product added:", product);
            console.log("Success, stock updated:", stock);
        } catch (err) {
            console.log("Error", err);
        }
    }
}

run().catch(console.error);
