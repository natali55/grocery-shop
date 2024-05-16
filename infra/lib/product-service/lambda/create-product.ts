import {
    DynamoDBClient,
    PutItemCommand
} from '@aws-sdk/client-dynamodb';
import { Handler } from 'aws-lambda';
import { v4 } from 'uuid';
import { Product } from '../../shared/product.model';

const dynamoDB: DynamoDBClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const productsTableName: string = process.env.PRODUCTS_TABLE_NAME as string;
const stockTableName: string = process.env.STOCK_TABLE_NAME as string;


export const createProduct: Handler = async (event: Product) => {
    try {
        console.log('Create product event:', event);

        const product = event;

        if (
            !product.title ||
            !product.description ||
            !product.price || !product.count
        ) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Wrong product format' }),
            }
        }

        const productId: string = v4();
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

        console.log("Products updated", productOutput);


        const stockUpdateCommand = new PutItemCommand({
            TableName: stockTableName,
            Item: { product_id: { S: productId }, count: { N: product.count.toString() } }
        });

        const stockOutput = await dynamoDB.send(stockUpdateCommand);


        console.log("Stock updated", stockOutput);

        return {
            statusCode: 200,
            body: JSON.stringify(product)
        };

    } catch (error) {
        console.error('Error in creating product:', error);

        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Error in creating product' }),
        }
    }
}
