/** Provision and wait for the existing app's test Connect venue before capture.
 * No payment, subscription or local Issuing action happens here. */
export async function prepareVenue(localURL) {
 console.log('Preparing Stripe test Connect venue');
 for(let attempt=0;attempt<150;attempt++){
  const response=await fetch(new URL('/api/connect/venue',localURL),{method:'POST',signal:AbortSignal.timeout(30000)});
  const result=await response.json();
  if(!response.ok||!result.ok)throw Error('Stripe test Connect venue could not be prepared');
  if(result.transfers==='active'){console.log('Stripe test Connect venue ready');return}
  if(attempt&&attempt%15===0)console.log('Waiting for Stripe test Connect verification');
  await new Promise(resolve=>setTimeout(resolve,2000));
 }
 throw Error('Stripe test Connect verification is still pending; rerun when active');
}
