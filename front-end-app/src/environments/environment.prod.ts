import { Config } from './config.interface';

export const environment: Config = {
  production: true,
  apiEndpoints: {
    product: 'https://bl3nb9judc.execute-api.us-east-1.amazonaws.com/prod',
    order: 'https://.execute-api.eu-west-1.amazonaws.com/dev',
    import: 'https://1oxjgyqpw3.execute-api.us-east-1.amazonaws.com/prod',
    bff: 'https://bl3nb9judc.execute-api.us-east-1.amazonaws.com/prod',
    cart: 'https://.execute-api.eu-west-1.amazonaws.com/dev',
  },
  apiEndpointsEnabled: {
    product: true,
    order: false,
    import: true,
    bff: true,
    cart: false,
  },
};
