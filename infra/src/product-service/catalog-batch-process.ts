import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';
import { SQSEvent } from "aws-lambda";
import { v4 as uuidv4 } from 'uuid';
import { DynamoDBClient, BatchWriteItemCommand } from '@aws-sdk/client-dynamodb';
import { Product } from './product.model';

const dynamoDBClient = new DynamoDBClient({ region: process.env.AWS_REGION });

const productTableName = process.env.PRODUCT_TABLE_NAME;
const stockTableName = process.env.STOCK_TABLE_NAME;
const topicArn = process.env.UPLOAD_TOPIC_ARN;
const snsClient = new SNSClient({ region: process.env.AWS_REGION})

export const catalogBatchProcess = async (event: SQSEvent) => {
    console.log('SQS Event:', event);

    const body: string = event.Records[0].body;
    const product: Product = JSON.parse(body);

    console.log('SQS Product:', product);

    try {
        const { title, description, price, count } = product;

        if(!title || !description || !price || !count) {
            console.error('Incomplete product data:', product);

            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Wrong product format' }),
            }
        }

        console.log('Product data:', title, description, price, count);

        const productId = uuidv4();
        const input = {
            RequestItems: {
                [productTableName as string]: [{
                    PutRequest: {
                        Item: {
                            id: { S: productId },
                            title: { S: title },
                            description: { S: description },
                            price: { N: price.toString() }
                        }
                    }
                }],
                [stockTableName as string]: [{
                    PutRequest: {
                        Item: {
                            product_id: { S: productId },
                            count: { N: count.toString() }
                        }
                    }
                }]
            }
        }

        const command = new BatchWriteItemCommand(input);

        await dynamoDBClient.send(command);
        await snsClient.send(new PublishCommand({
            TopicArn: topicArn,
            Message: JSON.stringify({
                id: productId,
                title: title,
                price: price,
                description: description,
                count: count
            })
        }))

        return {
            statusCode: 200,
            body: JSON.stringify('Product processed')
        };

    } catch(err: any) {
        console.error('Error while creating items:', err);

        return { statusCode: 500, body: JSON.stringify(err) }
    }

}
