import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Handler } from 'aws-lambda';
import csvParser from 'csv-parser';
import { awsRegion } from '../../environments/env';

const s3Client = new S3Client({ region: awsRegion });

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
                processStream(data.Body?.pipe(csvParser()));
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


function processStream(stream: any) {
    if (stream) {
        let data = '';

        stream.on('data', (chunk: any) => {
            data += chunk;
            console.log('Parsed row: ', chunk);
        });

        stream.on('end', async () => {
            console.log('File processing finished');
            console.log('Parsed Data: ', data);
        });
    } else {
        console.error('Stream is undefined');
    }
}
