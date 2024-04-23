import {
    DynamoDB,
    DynamoDBClient,
    GetItemCommand,
    PutItemCommand,
    PutItemCommandOutput,
    ScanCommand,
    UpdateItemCommand, UpdateItemCommandOutput
} from '@aws-sdk/client-dynamodb';
import { Handler } from 'aws-lambda';
import { v4 } from 'uuid';
import { ProductBase, ProductBaseWithId } from './product.model';

const dynamoDB: DynamoDBClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const productsTableName: string = process.env.PRODUCTS_TABLE_NAME as string;
const stockTableName: string = process.env.STOCK_TABLE_NAME as string;


export const createProduct: Handler = async (event: { body: string }) => {
    try {
        console.log('event', event);
        const product = JSON.parse(event.body);
        const productId: string = product.id || v4();
        const productPutCommand = new PutItemCommand({
            TableName: productsTableName,
            Item: {
                id: { S: productId },
                title: { S: product.title },
                price: { N: product.price.toString() },
                description: { S: product.description}
            }
        });

        const productOutput = await dynamoDB.send(productPutCommand);

        const stockCommand = new GetItemCommand({
            TableName: stockTableName,
            Key: { product_id: { S: productId } }
        });
        const stockItemRaw = await dynamoDB.send(stockCommand);

        let stockUpdateCommand: UpdateItemCommand | PutItemCommand;
        let stockOutput: PutItemCommandOutput | UpdateItemCommandOutput;

        if (stockItemRaw.Item) {
            stockUpdateCommand = new UpdateItemCommand({
                TableName: stockTableName,
                Key: { product_id: { S: productId } },
                ExpressionAttributeNames: {
                    '#C': 'count',
                },
                ExpressionAttributeValues: {
                    ':inc': { N: '1' },
                },
                UpdateExpression: 'ADD #C :inc',
                ReturnValues: 'UPDATED_NEW'
            });

            stockOutput = await dynamoDB.send(stockUpdateCommand);

        } else {
           stockUpdateCommand = new PutItemCommand({
                TableName: stockTableName,
                Item: { product_id: { S: productId }, count: { N: '1'} }
            });

            stockOutput = await dynamoDB.send(stockUpdateCommand);
        }

        console.log("Stock updated", stockOutput);

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Product is created'} )
        };

    } catch (error) {
        console.error('Error in creating product:', error);

        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Error in creating product' }),
        }
    }
}
