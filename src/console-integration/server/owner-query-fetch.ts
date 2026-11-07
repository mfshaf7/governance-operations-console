// One budget for a register query, including all of its owner continuations.
// Browser cancellation must stop obsolete work instead of leaving scans running.
export function ownerQueryFetch(callerSignal?:AbortSignal,fetchImpl:typeof fetch=fetch){
  const deadline=AbortSignal.timeout(80000);
  const signal=callerSignal?AbortSignal.any([callerSignal,deadline]):deadline;
  const bounded:typeof fetch=(url,init)=>fetchImpl(url,{...init,signal:init?.signal?AbortSignal.any([signal,init.signal]):signal});
  return {signal,fetchImpl:bounded};
}
