// Export is a versioned point-in-time snapshot, never a live mutable report.
export function snapshotReview(report,{state='complete',elapsedMs=report.metrics?.totalMs||0,gameResult=report.headers?.Result}={}) {
  const final=state==='complete',copy=structuredClone(report);
  copy.schemaVersion=2;
  copy.complete=final;
  copy.lifecycle={state,fullGameImported:['1-0','0-1','1/2-1/2'].includes(gameResult),initialAnalysisComplete:Boolean(report.reviewedMoves?.length),
    criticalVerificationComplete:['diagnostics-running','complete','partial'].includes(state) || report.lifecycle?.criticalVerificationComplete===true,finalAnalysisComplete:final,
    diagnosticsRequested:Boolean(report.options?.audits),errors:copy.metrics?.errors?.length||0};
  copy.metrics={...copy.metrics,totalMs:Math.max(0,elapsedMs)};
  copy.timingDefinitions={totalMs:'Wall time from review start to this snapshot; excludes PGN fetch and final DOM render',engineMs:'Sum of actual non-cached search durations, nested in requestMs',requestMs:'Serial awaited request time including IPC/cache/initialization; nested in baseMs/criticalMs/brilliantMs',initializationMs:'Engine readiness wait inside requestMs; not additive',criticalMs:'Critical-root and reply verification wall time, including requests, yields and progressive update callbacks (nested assembly/render work)',missMs:'Subset of classificationMs',classificationMs:'All report assembly time; not additive with missMs',engineSearches:'Known successful uncached engine requests; unknownRequestCount identifies failed or uninstrumented requests',fetchMs:'Separate import wall time, if measured in browser',renderMs:'Separate rendering work; initial rendering may also be nested in totalMs'};
  return copy;
}
