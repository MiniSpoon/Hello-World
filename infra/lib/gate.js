import cf from 'cloudfront';

// Missing key, or a store error, leaves the site open. Portal writes "sealed" to shut it.
var kvsId = '__KVS_ID__';
var SEALED = '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Hello World is sealed</title><style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#100e0c;color:#f3ead7;font-family:Georgia,Palatino,serif}main{text-align:center;padding:2rem;max-width:28rem}h1{font-weight:500;letter-spacing:.14em;text-transform:uppercase;font-size:1.25rem;margin:0 0 .8rem}p{color:#d2c4ae;line-height:1.5;margin:0}</style></head><body><main><h1>The gate is sealed</h1><p>Hello World is shut.<br>Open it from Portal.</p></main></body></html>';

async function handler(event) {
  try {
    var value = await cf.kvs(kvsId).get('gate');
    if (value === 'sealed') {
      return {
        statusCode: 503,
        statusDescription: 'Sealed',
        headers: {
          'content-type': { value: 'text/html; charset=utf-8' },
          'cache-control': { value: 'no-store' }
        },
        body: { encoding: 'text', data: SEALED }
      };
    }
  } catch (e) {
    return event.request;
  }
  return event.request;
}
