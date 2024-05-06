import { SQSEvent } from "aws-lambda";
import { v4 as uuidv4 } from 'uuid';
import { DynamoDBClient, BatchWriteItemCommand } from '@aws-sdk/client-dynamodb';
import { Product } from './product.model';

export const catalogBatchProcess = async (event: SQSEvent) => {
    const dynamoDBClient = new DynamoDBClient({ region: process.env.AWS_REGION });

    const productTableName = process.env.PRODUCT_TABLE_NAME;
    const stockTableName = process.env.STOCK_TABLE_NAME;

    console.log('SQS Event:', event);

    const body: string = event.Records[0].body;
    const products: Product[] = JSON.parse(body);

    console.log('SQS Products:', products);

    const productItems = [];
    const stockItems = [];

    for (const product of products) {
        try {
            const { title, description, price, count } = product;

            if(!title || !description || !price || !count) {
                console.error('Incomplete product data:', product);

                continue;
            }

            console.log('Product data:', title, description, price, count);

            const productId = uuidv4();

            productItems.push({
                PutRequest: {
                    Item: {
                        id: { S: productId },
                        title: { S: title },
                        description: { S: description },
                        price: { N: price.toString() }
                    }
                }
            });

            stockItems.push({
                PutRequest: {
                    Item: {
                        product_id: { S: productId },
                        count: { N: count.toString() }
                    }
                }
            });

            console.log('productItems array:', productItems);

            try {
                const input = {
                    RequestItems: {
                        [productTableName]: productItems,
                        [stockTableName]: stockItems
                    }
                }

                const command = new BatchWriteItemCommand(input);

                await dynamoDBClient.send(command);

            } catch(err: any) {
                console.error('Error while iterating items:', err);
            }
        } catch(err: any) {
            console.error('Error while creating items:', err);
        }
    }
}
