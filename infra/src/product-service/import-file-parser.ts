import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { SendMessageCommandInput } from '@aws-sdk/client-sqs/dist-types/commands/SendMessageCommand';
import { Handler } from 'aws-lambda';
import csvParser from 'csv-parser';

const s3Client = new S3Client({ region: process.env.AWS_REGION });
const sqsClient = new SQSClient({ region: process.env.AWS_REGION });
const queueUrlConstant = process.env.QUEUE_URL;

export const importFileParser: Handler = async (event: any) => {
        try {
            console.log('Import File Parser event', event);
            const records = event.Records;

            for (const record of records) {
                const { bucketName, key } = getBucketAndKey(record);

                console.log('Bucket & Key:', { bucketName, key } );

                const getObjectParams = {
                    Bucket: bucketName,
                    Key: key,
                };

                const data = await s3Client.send(new GetObjectCommand(getObjectParams));

                // @ts-ignore
                await processStream(data.Body?.pipe(csvParser()), queueUrlConstant);
            }

        } catch (err) {
            console.error('Unknown importFileParserHandler issue: ', err);
        }

};

function getBucketAndKey(record: any) {
    const bucketName = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));

    return { bucketName, key };
}


async function processStream(stream: any, queueUrl: string) {

        return new Promise((resolve, reject) => {
            const sqsParamsArray: SendMessageCommandInput[] = [];

            if (stream) {
                let data = '';
                 stream.on('end', async () => {
                    for (let index = 0; index < sqsParamsArray.length; index++){

                         await sqsClient.send(new SendMessageCommand(sqsParamsArray[index]));

                         console.log('Record string after sqsClient:', sqsParamsArray[index]?.MessageBody);

                     }
                     console.log('CSV file successfully processed');
                     resolve('CSV file successfully processed');
                 });

                stream.on('data', (chunk: any) => {

                    const recordString = JSON.stringify(chunk);
                    data += recordString;

                    console.log('Record string before sqsClient:', recordString);

                    const sqsParams = {
                        QueueUrl: queueUrl,
                        MessageBody: recordString,
                    };

                    sqsParamsArray.push(sqsParams);
                });
            }
            else {
                console.error('Stream is undefined');
                reject('Stream is undefined')
            }
        })
}
