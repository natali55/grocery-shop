import { APIGatewayTokenAuthorizerEvent } from 'aws-lambda';

export const basicAuthorizerUnique = async (event: APIGatewayTokenAuthorizerEvent) => {
    console.log('EVENT:', event)

    if (!event.authorizationToken) {
        return {
            statusCode: 401,
            body: 'Unauthorized'
        };
    }

    const token = event.authorizationToken;

    const encodedCredentials = token.split(' ')[1];
    const plainCredentials = (Buffer.from(encodedCredentials, 'base64')).toString('utf8');
    const [username, password] = plainCredentials.split(':');

    const storedUserPassword = process.env[username];
    const effect = !storedUserPassword || storedUserPassword !== password ? 'Deny' : 'Allow';

    if (effect === 'Deny') {
        return {
            statusCode: 403,
            body: 'Forbidden'
        };
    }

    return  generatePolicy(encodedCredentials, event.methodArn, effect);
};

const generatePolicy = (principalId: string, resource: string, effect: string) => {
    return {
        principalId,
        policyDocument: {
            Version: '2012-10-17',
            Statement: [
                {
                    Action: 'execute-api:Invoke',
                    Effect: effect,
                    Resource: resource
                }
            ]
        }
    };
}
