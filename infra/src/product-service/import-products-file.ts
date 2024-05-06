import {
    DynamoDBClient,
    PutItemCommand
} from '@aws-sdk/client-dynamodb';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { APIGatewayProxyEvent, Handler } from 'aws-lambda';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { awsRegion } from '../../environments/env';

const s3Client = new S3Client({ region: awsRegion });


export const importProductsFile = async (event: APIGatewayProxyEvent) => {
    try {
        console.log('Import Products Event:', event);
        const name = event.queryStringParameters?.name;

        if(!name) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'No file name provided'}),
            }
        }

        const putCommand = new PutObjectCommand({
            Bucket: process.env.BUCKET_NAME,
            Key: `uploaded/${name}`,
        });

        const url = await getSignedUrl(s3Client, putCommand, { expiresIn: 600 });

        return { body: JSON.stringify(url)}

    } catch(err: any) {
        console.error('Unknown issue!', err);

        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Unknown issue!', error: err.message}),
        };
    }
};
